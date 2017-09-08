import { validationFactory } from '~lib/utils';

export const ifNull = validationFactory((s: any) => s === null);
