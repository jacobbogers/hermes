import { validationFactory } from '~lib/utils';

export const ifUndefined = validationFactory((s: any) => s === undefined);
