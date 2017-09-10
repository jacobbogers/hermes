
/**
 * Flattens an array.
 *
 * @export
 * @param {*[]} arr The array that is to be flattened.
 * @returns {*[]} The flattened array.
 */
export function flatten(arr: any[]): any[] {
    try {
         const isArray  = Array.isArray;

        // Recursively tests elements in arr to see if they're arrays.
        // On first run, a is []
        // If b is an array, flatten b and concatenate it to a.
        // Otherwise, concatenate the non-array b to a.
         return arr.reduce((a, b) => a.concat(isArray(b) ? flatten(b) : b), []);
    } catch {
        // If not provided arguments, or if not given an array, throw an error.
        // This needs to be caught and handled in production.
        throw new TypeError('Invalid Type');
    }
}
