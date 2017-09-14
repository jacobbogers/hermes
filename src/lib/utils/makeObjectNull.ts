/**
 * Traverses the given object and turns all `undefined` fields into `null`.
 *
 * @export
 * @param {*} obj The object to traverse.
 */
export function makeObjectNull(obj: any) {
    for (const i in obj) {
        if (obj.hasOwnProperty(i) && obj[i] === undefined) {
            obj[i] = null;
        }
    }
}
