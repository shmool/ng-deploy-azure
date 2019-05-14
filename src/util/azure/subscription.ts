import { LinkedSubscription } from '@azure/ms-rest-nodeauth';
import { prompt } from 'inquirer';


export async function selectSubscription(
    subs: LinkedSubscription[] | undefined
): Promise<string> {
    if (Array.isArray(subs)) {
        if (subs.length === 0) {
            throw new Error(
                'You don\'t have any active subscriptions. ' +
                'Head to https://azure.com/free and sign in. From there you can create a new subscription ' +
                'and then you can come back and try again.'
            );
        } else if (subs.length === 1) {
            return subs[0].id;
        } else {
            const { sub } = await prompt([
                {
                    type: 'list',
                    name: 'sub',
                    choices: subs.map(choice => ({
                        name: `${ choice.name } – ${ choice.id }`,
                        value: choice.id
                    })),
                    message: 'Under which subscription should we put this static site?'
                }
            ]);
            return sub;
        }
    }

    throw new Error(
        'API returned no subscription IDs. It should. ' +
        'Log in to https://portal.azure.com and see if there\'s something wrong with your account.'
    );
}
