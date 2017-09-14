/**
 * Determines whether or not the given parameter is a function.
 *
 * @export
 * @param {*} f The parameter to check.
 * @returns {boolean} Return true if the input is a function, or false if it is not.
 */
export function isFunction(f: any): f is Function {
    return typeof f === 'function';
}
