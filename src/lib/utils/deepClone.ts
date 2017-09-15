import * as clone from 'clone';

export function deepClone<I>(obj: I): I {
  return clone(obj); // JSON.parse(JSON.stringify(obj));
}
