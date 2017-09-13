
function isString(value: any): value is string {
    return (typeof value === 'string');
}

export function makeValueslowerCase<I>(obj: I, ...props: (keyof I)[]) {
    for (const prop of props) {
        const interm = obj[prop];
        if (isString(interm)) {
            const value: string = obj[prop] as any;
            obj[prop] = value.toLocaleLowerCase() as any;
        }
    }
}
