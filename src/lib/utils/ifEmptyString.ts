import { validationFactory } from '~lib/utils';

export const ifEmptyString = validationFactory((s: any) => s === '');
