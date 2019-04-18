import { StorageManagementClient } from '@azure/arm-storage';
import { filteredList, ListItem } from '../prompt/list';
import { Aborter, ServiceURL } from '@azure/storage-blob';
import { DeviceTokenCredentials } from '@azure/ms-rest-nodeauth';
import { Logger } from '../shared/types';

interface AccountDetails extends ListItem {
    id: string;
    name: string;
    location: string;
}

const accountPromptOptions = {
    name: 'account',
    message: 'Under which storage account should we put this static site?'
};

const newAccountPromptOptions = {
    name: 'newAccount',
    message: 'Enter a name for the new storage account:',
    title: 'Create a new storage account',
    default: '',
    validate: (name: string) => Promise.resolve(true)
};

export function getAzureStorageClient(credentials: DeviceTokenCredentials, subscriptionId: string) {
    return new StorageManagementClient(credentials, subscriptionId);
}

export async function getAccountName(
    client: StorageManagementClient,
    resourceGroupName: string,
    projectName: string,
    logger: Logger) {

    const accounts = await client.storageAccounts.listByResourceGroup(resourceGroupName);
    newAccountPromptOptions.default = await generateDefaultAccountName(client, projectName, logger);
    newAccountPromptOptions.validate = checkNameAvailability(client, logger, true);

    return await filteredList(accounts as AccountDetails[], accountPromptOptions, newAccountPromptOptions);
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
    resourceGroup: string,
    location: string
) {
    const poller = await client.storageAccounts.beginCreate(
        resourceGroup,
        account,
        {
            kind: 'StorageV2',
            location,
            sku: { name: 'Standard_LRS' }
        }
    );
    await poller.pollUntilFinished();
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
