/**
 * Copies properties that exist in <target> and <source> from <source> to <target>.
 *
 * @export
 * @template T Any target object of type T.
 * @template S Any source object of type S.
 * @param {T} target The receiving object.
 * @param {S} source The source object.
 */
export function copyProperties<T, S>(target: T, source: S) {
    let p1: keyof T;

    for (p1 in target) {
        if (target.hasOwnProperty(p1) && source.hasOwnProperty(p1)) {
            target[p1] = (source as any)[p1];
        }
    }
    return target;
}
