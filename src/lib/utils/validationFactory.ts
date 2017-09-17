import * as util from 'util';

export type validation = (s: any) => boolean;

export function validationFactory(testFunction: validation) {
    return (assertFunction: (...args: any[]) => void, testObject: any, ...rest: any[]) => {
        if (testFunction(testObject)) {
            const fun = util.format;
            const m = util.format.apply(fun, rest);
            assertFunction(m);
        }
    };
}
