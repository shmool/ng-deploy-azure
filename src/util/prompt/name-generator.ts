export async function generateName(name: string, validate: (name: string) => Promise<boolean>) {
    let valid = false;
    do {
        valid = await validate(name);
        if (!valid) {
            name = `${ name }${ Math.ceil(Math.random() * 100) }`;
        }
    } while (!valid);
    return name;
}
