/**
 * Deep clone an object.
 *
 * @export
 * @template T Any type of serializable object.
 * @param {T} obj The object to be cloned.
 * @returns {T} The cloned object.
 */
export function deepClone<T>(obj: T): T {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        throw e;
    }
}
