import { validationFactory } from '~lib/utils';

export const ifUndefined = validationFactory((s: any) => {
    return s === undefined;
});
