import { StorageManagementClient } from '@azure/arm-storage';
import { filteredList, ListItem } from '../prompt/list';
import { Aborter, ServiceURL, SharedKeyCredential } from '@azure/storage-blob';
import { DeviceTokenCredentials } from '@azure/ms-rest-nodeauth';
import { Logger } from '../shared/types';
import { SchematicsException } from '@angular-devkit/schematics';
import { ResourceGroup } from './resource-group';

interface AccountDetails extends ListItem {
    id: string;
    name: string;
    location: string;
}

const accountPromptOptions = {
    id: 'account',
    message: 'Under which storage account should we put this static site?'
};

const newAccountPromptOptions = {
    id: 'newAccount',
    message: 'Enter a name for the new storage account:',
    name: 'Create a new storage account',
    default: '',
    validate: (name: string) => Promise.resolve(true)
};

export function getAzureStorageClient(credentials: DeviceTokenCredentials, subscriptionId: string) {
    return new StorageManagementClient(credentials, subscriptionId);
}

export async function getAccount(
    client: StorageManagementClient,
    resourceGroup: ResourceGroup,
    projectName: string,
    logger: Logger) {

    const accounts = await client.storageAccounts.listByResourceGroup(resourceGroup.name);
    // TODO: default name can be assigned later, only if creating a new account
    newAccountPromptOptions.default = await generateDefaultAccountName(client, projectName, logger);
    newAccountPromptOptions.validate = checkNameAvailability(client, logger, true);

    const result = await filteredList(accounts as AccountDetails[], accountPromptOptions, newAccountPromptOptions);

    const needToCreateAccount = !!result.newAccount;
    const accountName = result.newAccount || result.account.name;

    if (needToCreateAccount) {
        logger.info(`creating ${ accountName }`);
        await createAccount(accountName, client, resourceGroup.name, resourceGroup.location, logger);
    }

    // TODO: should we check that an existing account has account keys?
    //  (retrieved for a new account, see createAccount() )
    // TODO: existing account - check that it has the right configuration (public etc.)

    return accountName;
}

function checkNameAvailability(client: StorageManagementClient, logger: Logger, warn?: boolean) {
    return async (account: string) => {
        const availability = await client.storageAccounts.checkNameAvailability(account);
        if (!availability.nameAvailable && warn) {
            logger.warn(availability.message || 'chosen name is not available');
        }
        return !!availability.nameAvailable;
    };
}

async function generateDefaultAccountName(client: StorageManagementClient, projectName: string, logger: Logger) {
    const normalizedProjectNameArray = projectName.match(/[a-zA-Z0-9]/g);
    const normalizedProjectName = normalizedProjectNameArray ? normalizedProjectNameArray.join('') : '';
    let name = `${ normalizedProjectName }storage`;
    let valid = false;
    const validate = checkNameAvailability(client, logger, false);
    do {
        valid = await validate(name);
        if (!valid) {
            name = `${ name }${ Math.ceil(Math.random() * 100) }`;
        }
    } while (!valid);
    return name;
}

export async function setStaticSiteToPublic(serviceURL: ServiceURL) {
    await serviceURL.setProperties(Aborter.timeout(30 * 60 * 60 * 1000), {
        staticWebsite: {
            enabled: true,
            indexDocument: 'index.html',
            errorDocument404Path: 'index.html'
        }
    });
}

export async function getAccountKey(
    account: any,
    client: StorageManagementClient,
    resourceGroup: any
) {
    const accountKeysRes = await client.storageAccounts.listKeys(
        resourceGroup,
        account
    );
    const accountKey = (accountKeysRes.keys || []).filter(
        key => (key.permissions || '').toUpperCase() === 'FULL'
    )[0];
    if (!accountKey || !accountKey.value) {
        process.exit(1);
        return '';
    }
    return accountKey.value;
}

export async function createAccount(
    account: string,
    client: StorageManagementClient,
    resourceGroupName: string,
    location: string,
    logger: Logger
) {
    const poller = await client.storageAccounts.beginCreate(
        resourceGroupName,
        account,
        {
            kind: 'StorageV2',
            location,
            sku: { name: 'Standard_LRS' }
        }
    );
    await poller.pollUntilFinished();

    logger.info('retrieving account keys');
    const accountKey = await getAccountKey(account, client, resourceGroupName);
    if (!accountKey) {
        throw new SchematicsException('no keys retrieved for storage account');
    }
    logger.info('Done');

    logger.info('creating web container');
    await createWebContainer(client, resourceGroupName, account);
    const pipeline = ServiceURL.newPipeline(
        new SharedKeyCredential(account, accountKey)
    );
    const serviceURL = new ServiceURL(
        `https://${ account }.blob.core.windows.net`,
        pipeline
    );
    logger.info('setting container to be publicly available static site');
    await setStaticSiteToPublic(serviceURL);
    logger.info('Done');


}

export async function createWebContainer(
    client: StorageManagementClient,
    resourceGroup: any,
    account: any
) {
    await client.blobContainers.create(resourceGroup, account, '$web', {
        publicAccess: 'Container',
        metadata: {
            cli: 'ng-deploy-azure'
        }
    });
}
