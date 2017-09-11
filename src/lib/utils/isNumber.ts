export function isNumber(p: any): p is number {
    return Number.isFinite(p);
}
