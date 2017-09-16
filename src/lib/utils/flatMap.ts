/**
 * Flattens a Map of n-dimensions.
 *
 * @export
 * @template T An object of any type
 * @template F not sure???
 * @template Mc A map whose values are either nested maps, or some other type.
 * @param {Map} map An n-dimensional map.
 * @returns {*[]} A 1D array of values of any type.
 */
export function flatMap<
    T,
    F extends { obj: T },
    Mc extends Map<T[keyof T], Mc | F>
>(map: Mc): F[] {
    const flattened: F[] = [];
    for (const itm of map.values()) {
        if (itm instanceof Map) {
            const rc2: F[] = flatMap(itm);
            flattened.push(...rc2);
            continue;
        }
        flattened.push(itm);
    }

    return flattened;
}
