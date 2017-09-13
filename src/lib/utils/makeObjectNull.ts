// tslint:disable:typedef

export function makeObjectNull(obj: any) {
  for (const i in obj) {
    if (obj[i] === undefined) {
      obj[i] = null;
    }
  }
}
