import { StorageManagementClient } from '@azure/arm-storage';
import { filteredList, ListItem, newItemPrompt } from '../prompt/list';
import { Aborter, ServiceURL, SharedKeyCredential } from '@azure/storage-blob';
import { DeviceTokenCredentials } from '@azure/ms-rest-nodeauth';
import { AddOptions, Logger } from '../shared/types';
import { SchematicsException } from '@angular-devkit/schematics';
import { ResourceGroup } from './resource-group';
import { generateName } from '../prompt/name-generator';

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
    defaultGenerator: (name: string) => Promise.resolve(''),
    validate: (name: string) => Promise.resolve(true)
};

export function getAzureStorageClient(credentials: DeviceTokenCredentials, subscriptionId: string) {
    return new StorageManagementClient(credentials, subscriptionId);
}

export async function getAccount(
    client: StorageManagementClient,
    resourceGroup: ResourceGroup,
    options: AddOptions,
    logger: Logger) {

    let accountName = options.account || '';
    let needToCreateAccount = false;

    const accounts = await client.storageAccounts.listByResourceGroup(resourceGroup.name);

    function getInitialAccountName() {
        const normalizedProjectNameArray = options.project.match(/[a-zA-Z0-9]/g);
        const normalizedProjectName = normalizedProjectNameArray ? normalizedProjectNameArray.join('') : '';
        return `${ normalizedProjectName }static`;
    }

    const initialName = getInitialAccountName();
    const generateDefaultAccountName = accountNameGenerator(client, logger);
    const validateAccountName = checkNameAvailability(client, logger, true);

    newAccountPromptOptions.default = initialName;
    newAccountPromptOptions.defaultGenerator = generateDefaultAccountName;
    newAccountPromptOptions.validate = validateAccountName;


    if (accountName) {
        const account = accounts.find(acc => acc.name === accountName);
        if (!!account) { // account exists
            // TODO: check account configuration
            logger.info(`Using existing account ${ accountName }`);

        } else { // create account with this name, if valid
            const valid = await validateAccountName(accountName);
            if (!valid) {
                accountName = (await newItemPrompt(newAccountPromptOptions)).newAccount;
            }
            needToCreateAccount = true;
        }
    } else { // no account flag

        if (!options.manual) { // quickstart - create w/ default name
            accountName = await generateDefaultAccountName(initialName);
            needToCreateAccount = true;

        } else { // select from list or create new
            const result = await filteredList(accounts as AccountDetails[], accountPromptOptions, newAccountPromptOptions);
            needToCreateAccount = !!result.newAccount;
            accountName = result.newAccount || result.account.name;
        }
    }

    if (needToCreateAccount) {
        logger.info(`creating ${ accountName }`);
        await createAccount(accountName, client, resourceGroup.name, resourceGroup.location, logger);
    }

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

function accountNameGenerator(client: StorageManagementClient, logger: Logger) {
    return async (name: string) => {
        return await generateName(name, checkNameAvailability(client, logger, false));
    };
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
