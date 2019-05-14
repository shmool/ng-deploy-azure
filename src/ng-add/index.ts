import { chain, Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import getLogo from '../util/azure/msft';
import { loginToAzure } from '../util/azure/auth';
import { DeviceTokenCredentials } from '@azure/ms-rest-nodeauth';
import { selectSubscription } from '../util/azure/subscription';
import { getResourceGroup } from '../util/azure/resource-group';
import { getAccount, getAzureStorageClient } from '../util/azure/account';
import { AngularWorkspace } from '../util/workspace/angular-json';
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
        // TODO: if azure.json already exists: get data / delete / error

        const project = new AngularWorkspace(tree, _options);

        const auth = await loginToAzure(_context.logger);
        const credentials = auth.credentials as DeviceTokenCredentials;
        project.addLogoutArchitect();

        const subscription = await selectSubscription(auth.subscriptions);

        const resourceGroup = await getResourceGroup(credentials, subscription, _options.project, _context.logger);

        const client = getAzureStorageClient(credentials, subscription);

        const account = await getAccount(client, resourceGroup, _options.project, _context.logger);

        const appDeployConfig = {
            project: project.projectName,
            target: project.target,
            configuration: project.configuration,
            path: project.path
        };

        const azureDeployConfig = {
            subscription,
            resourceGroupName: resourceGroup.name,
            account
        };

        // TODO: log url for account at Azure portal
        generateAzureJson(tree, appDeployConfig, azureDeployConfig);

        project.addDeployArchitect();
    };
}
