import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import getLogo from '../util/azure/msft';
import { ServiceURL, SharedKeyCredential } from '@azure/storage-blob';
import { loginToAzure } from '../util/azure/auth';
import { DeviceTokenCredentials } from '@azure/ms-rest-nodeauth';
import { chooseSubscription } from '../util/azure/subscription';
import { createResourceGroup, getLocation, getResourceGroup } from '../util/azure/resource-group';
import {
    createAccount,
    getAccountKey,
    createWebContainer, getAccountName, setStaticSiteToPublic,
    getAzureStorageClient
} from '../util/azure/account';
import { addDeployToProject, AngularWorkspace } from '../util/workspace/angular-json';
import { generateAzureJson } from '../util/workspace/azure-json';


export function ngAdd(_options: any): Rule {
    return (tree: Tree, _context: SchematicContext) => {
        return chain([
            logMsftLogo(),
            addDeployAzure(_options)
        ])(tree, _context);
    };
}

function logMsftLogo(): Rule {
    return (tree: Tree, _context: SchematicContext): Tree => {
        _context.logger.info(getLogo());
        _context.logger.info('');
        return tree;
    };
}

export function addDeployAzure(_options: any): Rule {
    return async (tree: Tree, _context: SchematicContext) => {

        const project = new AngularWorkspace(tree, _options);

        const auth = await loginToAzure(_context.logger);
        const credentials = auth.credentials as DeviceTokenCredentials;

        const subscription = await chooseSubscription(auth.subscriptions);

        if (!subscription) {
            return;
        }

        const resourceGroupResult = await getResourceGroup(credentials, subscription, _options.project);

        const resourceGroupName = resourceGroupResult.resourceGroup || resourceGroupResult.newResourceGroup;

        let location;
        if (resourceGroupResult.newResourceGroup) {
            location = await getLocation();
            _context.logger.info(`creating resource group ${ resourceGroupName }`);
            await createResourceGroup(resourceGroupName, subscription, credentials, location);
        }
        const client = getAzureStorageClient(credentials, subscription);

        const accountName = await getAccountName(client, resourceGroupName, _options.project, _context.logger);

        const needToCreateAccount = !!accountName.newAccount;

        const account = accountName.account || accountName.newAccount;
        if (needToCreateAccount) {
            if (!location) {
                location = await getLocation();
            }
            _context.logger.info(`creating ${ account }`);
            await createAccount(account, client, resourceGroupName, location);
        }

        _context.logger.info('retrieving account keys');
        const accountKey = await getAccountKey(account, client, resourceGroupName);
        accountKey ? _context.logger.info('Done') : _context.logger.error('no keys retrieved for storage account');

        if (needToCreateAccount) {
            _context.logger.info('creating web container');
            await createWebContainer(client, resourceGroupName, account);
            const pipeline = ServiceURL.newPipeline(
                new SharedKeyCredential(account, accountKey)
            );
            const serviceURL = new ServiceURL(
                `https://${ account }.blob.core.windows.net`,
                pipeline
            );
            _context.logger.info('setting container to be publicly available static site');
            await setStaticSiteToPublic(serviceURL);
            _context.logger.info('Done');

        }


        const appDeployConfig = {
            project: project.projectName,
            target: project.target,
            configuration: project.configuration,
            path: project.path
        };

        const azureDeployConfig = {
            subscription,
            resourceGroupName,
            account
        };

        addDeployToProject(project);

        generateAzureJson(tree, appDeployConfig, azureDeployConfig);
    };
}
