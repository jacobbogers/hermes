export function deepClone<I, T>(obj: I): T {
  return JSON.parse(JSON.stringify(obj));
}
