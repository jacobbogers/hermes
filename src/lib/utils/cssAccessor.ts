/**
 * Provides a helper function for accessing CSS Module class names from imported stylesheets.
 *
 * @export
 * @param {[index: String]: String} cssObject The imported css object.
 * @returns An accessor function that maps its arguments to cssObject's keys.
 */
export function cssAccessor(cssObject: { [index: string]: string }) {
    /**
     * Uses the given properties to get class names from cssObject.
     *
     * @param {String[]} rest The properties to retrieve from cssObject.
     * @returns {String} The mapped properties joined by spaces.
     */
    return function accessor(...rest: string[]): string {
        return rest.map(cn => cssObject[cn]).join(' ');
    };
}
