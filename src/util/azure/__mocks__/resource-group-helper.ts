console.log('resource group helper');

export async function getResourceGroups() {
  return Promise.resolve([{
    id: '1',
    name: 'mock',
    location: 'location'
  },
  {
    id: '2',
    name: 'mock2',
    location: 'location'
  },
  {
    id: '3',
    name: 'mock3',
    location: 'location'
  }]);
}

export async function createResourceGroup(name: string) {
  return Promise.resolve({ name });
}

