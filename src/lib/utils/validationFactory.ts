import * as util from 'util';

export type validation = (s: any) => boolean;

export function validationFactory(v: validation) {
    return (exec: (...args: any[]) => void, obj: any, ...rest: any[]) => {
        if (v(obj)) {
            const fun = util.format;
            const m = util.format.apply(fun, rest);

            return exec(m);
        }
    };
}
