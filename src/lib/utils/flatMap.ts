export function flatMap<
    T,
    F extends { obj: T },
    Mc extends Map<T[keyof T], Mc | F>
>(map: Mc): F[] {
    const rc: F[] = [];
    for (const itm of map.values()) {
        if (itm instanceof Map) {
            const rc2 = flatMap(itm);
            rc.push(...(rc2 as F[]));
            continue;
        }
        rc.push(itm);
    }
    return rc;
}
