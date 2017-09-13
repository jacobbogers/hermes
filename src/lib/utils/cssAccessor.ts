export function cssAccessor(cssObject: { [index: string]: string }) {
  const myCss = cssObject;

  return function accessor(...rest: string[]): string {
    return rest.map(cn => myCss[cn]).join(' ');
  };
}
