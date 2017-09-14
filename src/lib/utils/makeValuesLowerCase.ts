import { isString } from '~lib/utils/isString';

/**
 * Makes specified values lowercase in a given object.
 *
 * @export
 * @template I An object of type I.
 * @param {I} obj The object that needs to have its values lowercased.
 * @param {...(keyof I)[]} props The properties to be lowercased.
 */
export function makeValuesLowerCase<I>(obj: I, ...props: (keyof I)[]) {
    for (const prop of props) {
        const value: any = obj[prop];
        if (isString(value)) {
            obj[prop] = value.toLocaleLowerCase() as any;
        }
    }
}
