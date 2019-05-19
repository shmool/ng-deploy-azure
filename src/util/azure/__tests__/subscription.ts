import { selectSubscription } from '../subscription';
import { LinkedSubscription } from '@azure/ms-rest-nodeauth';
import { AddOptions } from '../../shared/types';

jest.mock('inquirer');


// AddOptions, Logger


const SUBID = '124';

const optionsMock = <AddOptions>{ 
  subscriptionId: SUBID 
};

// const optionsMockEmpty = <AddOptions>{};

const loggerMock = { 
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn()
};

describe('subscription', () => {
  test('should throw error when input is an EMPTY array', async () => {
    const errorMessage = 'You don\'t have any active subscriptions. ' +
      'Head to https://azure.com/free and sign in. From there you can create a new subscription ' +
      'and then you can come back and try again.';

    // TODO: assert logger warn is called too
    // there are 2 cases here, sub is provided, and sub is not provided

    expect(selectSubscription([], optionsMock, loggerMock)).rejects.toEqual(new Error(errorMessage))
  });

  test('provided sub id DOES NOT match when provided in options', async() => {
    // TODO should check we get sub id back and log.warn
    const subs = <Array<LinkedSubscription>>[{
      id: '456',
      name: 'a sub'
    }];

    selectSubscription(subs, optionsMock, loggerMock);
  })

  test('should return first subscriptions id, if only ONE subscription', async () => {
    const singleSubscription = { id: SUBID, name: 'subscription'  };

    const subs = <Array<LinkedSubscription>>[singleSubscription];
    const actual = await selectSubscription(subs, optionsMock, loggerMock);

    // TODO: assert logger warn is called here
    expect(loggerMock.warn.mock.calls[0][0]).toBe(`Using subscription ${singleSubscription.name} - ${singleSubscription.id}`);


    expect(actual).toEqual(singleSubscription.id);
  });

  test('should throw error when input is undefined', async () => {
    const errorMessage = 'API returned no subscription IDs. It should. ' +
      'Log in to https://portal.azure.com and see if there\'s something wrong with your account.';

    expect(selectSubscription(undefined, optionsMock, loggerMock)).rejects.toEqual(new Error(errorMessage))
  });

  test('should prompt user to select a subscription if more than one subscription', async () => {
    const expected = 'subMock'; // check inquirer.js at __mocks__ at root level

    const subs = <Array<LinkedSubscription>>[
      { id: 'abc', name: 'subMock' },
      { id: '123', name: 'sub2' }
    ];
    const actual = await selectSubscription(subs, optionsMock, loggerMock);

    expect(actual).toEqual(expected);
  });
});

