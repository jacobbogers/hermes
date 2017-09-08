export function makeValueslowerCase<I>(obj: I, ...props: (keyof I)[]) {
    for (const prop of props) {
        if (typeof obj[prop] === 'string') {
            const value: string = obj[prop] as any;
            obj[prop] = value.toLocaleLowerCase() as any;
        }
    }
}
