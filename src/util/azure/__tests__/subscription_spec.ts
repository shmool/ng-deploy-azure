import { chooseSubscription } from '../subscription';
import { LinkedSubscription } from '@azure/ms-rest-nodeauth';

jest.mock('inquirer');

describe('subscription', () => {
  test('should return first subscriptions id, if only one subscription', async() => {
    const expected = 'abc';

    const subs = <Array<LinkedSubscription>>[{ id: expected }];
    const actual = await chooseSubscription(subs);

    expect(actual).toEqual(expected);
  });

  test('should throw error when input is undefined', async() => {
    const errorMessage = 'API returned no subscription IDs. It should. ' +
      'Log in to https://portal.azure.com and see if there\'s something wrong with your account.';

    expect(chooseSubscription(undefined)).rejects.toEqual(new Error(errorMessage))
  });

  test('should throw error when input is an empty array', async () => {
    const errorMessage = 'You don\'t have any active subscriptions. ' +
      'Head to https://azure.com/free and sign in. From there you can create a new subscription ' +
      'and then you can come back and try again.';

    expect(chooseSubscription([])).rejects.toEqual(new Error(errorMessage))
  });

  test('should prompt user to select a subscription if more than one subscription', async() => {
    const expected = 'subMock'; // check inquirer.js at __mocks__ at root level

    const subs = <Array<LinkedSubscription>>[
      { id: 'abc', name: 'subMock' },
      { id: '123', name: 'sub2' }
    ];
    const actual = await chooseSubscription(subs);

    expect(actual).toEqual(expected);
  });
});