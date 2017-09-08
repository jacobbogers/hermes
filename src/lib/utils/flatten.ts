export function flatten(...rest: any[]): any[] {
    const rc = [];
    for (const itm of rest) {
        if (itm instanceof Array) {
            const rc2 = flatten(...itm);
            rc.push(...rc2);
            continue;
        }
        rc.push(itm);
    }
    return rc;
}
