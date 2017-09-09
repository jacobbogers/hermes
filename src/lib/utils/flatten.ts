/**
 * Flattens an array.
 *
 * @export
 * @param {*[]} arr The array that is to be flattened.
 * @returns {*[]} The flattened array.
 */
export function flatten(arr: any[]): any[] {
    try {
        // tslint:disable
        // Use Array.isArray to test if a value is an array
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
        // http://web.mit.edu/jwalden/www/isArray.html
        // tslint:enable
        // tslint:disable-next-line:typedef
        const { isArray } = Array;

        // Recursively tests elements in arr to see if they're arrays.
        // On first run, a is []
        // If b is an array, flatten b and push its elements to a.
        // Otherwise, push the non-array b to a.
        return arr.reduce(
            (a: any, b: any): any[] =>
                (isArray(b) ? a.push(...flatten(b)) : a.push(b)) && a,
            []
        );
    } catch {
        // If not provided arguments, or if not given an array, throw an error.
        // This needs to be caught and handled in production.
        throw new TypeError('Invalid Type');
    }
}
