/**
 * Evaluates whether or not the given parameter `p` is a finite number.
 *
 * @export
 * @param {*} p A value of any type
 * @returns {boolean} A boolean that determines whether or not value `p` is a number.
 */
export function isNumber(p: any): p is number {
    return Number.isFinite(p);
}
