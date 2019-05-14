import { DeviceTokenCredentials } from '@azure/ms-rest-nodeauth';
import { ResourceManagementClient } from '@azure/arm-resources';
import { filteredList, ListItem } from '../prompt/list';
import { locations } from './locations';
import * as Models from '@azure/arm-resources/lib/models/index';
import { Logger } from '../shared/types';

export interface ResourceGroup {
    id: string;
    name: string;
    location: string;
}

interface ResourceGroupDetails extends ListItem {
    id: string;
    name: string;
    properties?: any;
    location: string;
}

const resourceGroupsPromptOptions = {
    id: 'resourceGroup',
    message: 'Under which resource group should we put this static site?'
};

const newResourceGroupsPromptOptions = {
    id: 'newResourceGroup',
    message: 'Enter a name for the new resource group:',
    name: 'Create a new resource group',
    default: ''
};

const locationPromptOptions = {
    id: 'location',
    message: 'In which location should the storage account be created?'
};

export async function getResourceGroup(
    creds: DeviceTokenCredentials, subscription: string, projectName: string, logger: Logger
) {
    const client = new ResourceManagementClient(creds, subscription);
    // TODO: default name can be assigned later, only if creating a new resource group.
    // TODO: check availability of the default name
    newResourceGroupsPromptOptions.default = projectName;

    const chosenResourceGroup = await filteredList(
        await client.resourceGroups.list() as ResourceGroupDetails[],
        resourceGroupsPromptOptions,
        newResourceGroupsPromptOptions);

    // TODO: add check whether the new resource group doesn't already exist.
    //  Currently throws an error of exists in a different location:
    //  Invalid resource group location 'westus'. The Resource group already exists in location 'eastus2'.

    const resourceGroupName = chosenResourceGroup.resourceGroup || chosenResourceGroup.newResourceGroup;

    let location;
    if (chosenResourceGroup.newResourceGroup) {
        location = await getLocation();
        logger.info(`creating resource group ${ resourceGroupName } at ${ location.name } (${ location.id })`);
        return await createResourceGroup(resourceGroupName, subscription, creds, location.id);
    }

    return chosenResourceGroup.resourceGroup;
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
): Promise<Models.ResourceGroupsCreateOrUpdateResponse> {
    // TODO: throws an error here if the subscription is wrong
    const client = new ResourceManagementClient(creds, subscription);
    const resourceGroupRes = await client.resourceGroups.createOrUpdate(name, { location });
    return resourceGroupRes;
}
