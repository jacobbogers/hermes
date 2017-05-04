

import * as util from 'util';

type validation = (s: any) => boolean;


function validationFactory(v: validation) {
    return (exec: Function, obj: any, ...rest: any[]) => {
        if (v(obj)) {
            let fun = util.format;
            let m = util.format.apply(fun, rest);
            return exec(m);
        }
    };
}


export const ifNull = validationFactory((s: any) => { return s === null; });
export const ifUndefined = validationFactory((s: any) => { return s === undefined; });
export const ifEmptyString = validationFactory((s: any) => { return s === ''; });
export const ifInvalidPortString = validationFactory((s: any) => {
    return !(s && /^[0-9]+$/.test(s) && Number.parseInt(s) > 0);
});


export function staticCast<T>(obj: any): T {
    return obj as T;
}


export function makeObjectNull(obj: any) {
    for (let i in obj) {
        if (obj[i] === undefined) {
            obj[i] = null;
        }
    }
}
