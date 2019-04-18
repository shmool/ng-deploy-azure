import * as inquirer from 'inquirer';

const fuzzy = require('fuzzy');

export interface PromptOptions {
    name: string;
    message: string;
    default?: string;
    title?: string;
    validate?: any;
}

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

export async function filteredList(list: ListItem[], listOptions: PromptOptions, newItemOptions?: PromptOptions) {
    if (!list || list.length === 0) {
        return newItemOptions && newItemPrompt(newItemOptions);
    }

    const displayedList = newItemOptions ? [{ name: newItemOptions.title }, ...list] : list;
    const result = await listPrompt(displayedList as ListItem[], listOptions.name, listOptions.message);

    if (newItemOptions && result[listOptions.name] === newItemOptions.title) {
        return newItemPrompt(newItemOptions);
    }
    return result;
}

export async function newItemPrompt(newItemOptions: PromptOptions) {
    let item, valid = true;
    do {
        item = await (inquirer as any).prompt({
            type: 'input',
            name: newItemOptions.name,
            default: newItemOptions.default,
            message: newItemOptions.message
        });

        if (newItemOptions.validate) {
            valid = await newItemOptions.validate(item[newItemOptions.name]);
        }
    } while (!valid);

    return item;
}

export function listPrompt(list: ListItem[], name: string, message: string) {
    return (inquirer as any).prompt({
        type: 'autocomplete',
        name,
        source: searchList(list),
        message
    });
}

const isListItem = (elem: ListItem | { original: ListItem }): elem is ListItem => {
    return (<{ original: ListItem }>elem).original === undefined;
};

export interface ListItem {
    name: string;
}

function searchList(list: ListItem[]) {
    return (_: any, input: string) => {
        return Promise.resolve(
            fuzzy
                .filter(input, list, {
                    extract(el: ListItem) {
                        return el.name;
                    }
                })
                .map((result: ListItem | { original: ListItem }) => {
                    let original: ListItem;
                    if (isListItem(result)) {
                        original = result;
                    } else {
                        original = result.original;
                    }
                    return original;
                })
        );
    };
}
