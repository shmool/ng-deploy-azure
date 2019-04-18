import { DeviceTokenCredentials } from '@azure/ms-rest-nodeauth';
import { ResourceManagementClient } from '@azure/arm-resources';
import { filteredList, ListItem } from '../prompt/list';
import { locations } from './locations';

interface ResourceGroupDetails extends ListItem {
    id: string;
    name: string;
    properties?: any;
    location: string;
}

const resourceGroupsPromptOptions = {
    name: 'resourceGroup',
    message: 'Under which resource group should we put this static site?'
};

const newResourceGroupsPromptOptions = {
    name: 'newResourceGroup',
    message: 'Enter a name for the new resource group:',
    title: 'Create a new resource group',
    default: ''
};

const locationPromptOptions = {
    name: 'location',
    message: 'In which location should the storage account be created?'
};

export async function getResourceGroup(creds: DeviceTokenCredentials, subscription: string, projectName: string) {
    const client = new ResourceManagementClient(creds, subscription);
    newResourceGroupsPromptOptions.default = projectName;

    return await filteredList(
        await client.resourceGroups.list() as ResourceGroupDetails[],
        resourceGroupsPromptOptions,
        newResourceGroupsPromptOptions);
}

export async function getLocation() {
    const res = await filteredList(locations, locationPromptOptions);
    return res.location;
}


export async function createResourceGroup(
    name: string,
    subscription: string,
    creds: DeviceTokenCredentials,
    location: string
): Promise<void> {
    // TODO throws an error here if the subscription is wrong
    const client = new ResourceManagementClient(creds, subscription);
    await client.resourceGroups.createOrUpdate(name, { location });
}
