// tslint:disable:typedef

export function copyProperties<T, S>(target: T, source: S) {

  let  p1: keyof T;

  for (p1 in target) {
    if (p1 in source) {
      target[p1] = (source as any)[p1];
    }
  }
}
