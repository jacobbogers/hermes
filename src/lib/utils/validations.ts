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

export const ifNull = validationFactory((s: any) => s === null);
export const ifEmptyString = validationFactory((s: any) => s === '');
export const ifInvalidPortString = validationFactory((s: any) => !(s && /^[0-9]+$/.test(s) && Number.parseInt(s) > 0));
export const ifUndefined = validationFactory((s: any) => s === undefined);
