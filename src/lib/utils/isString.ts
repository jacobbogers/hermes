/**
 * Determines whether the given parameter is a string.
 *
 * @export
 * @param {*} s An object of any type.
 * @returns {boolean} Return true if the given parameter is a string, otherwise false.
 */
export function isString(s: any): s is string {
    return typeof s === 'string';
}
