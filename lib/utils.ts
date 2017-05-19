'use strict';

import * as util from 'util';
import * as fs from 'fs';

type validation = (s: any) => boolean;

function validationFactory(v: validation) {
    return (exec: Function, obj: any, ...rest: any[]) => {
        if (v(obj)) {
            let fun = util.format;
            let m = util.format.apply(fun, rest);
            return exec(m);
        }
    };
}


export const ifNull = validationFactory((s: any) => { return s === null; });
export const ifUndefined = validationFactory((s: any) => { return s === undefined; });
export const ifEmptyString = validationFactory((s: any) => { return s === ''; });
export const ifInvalidPortString = validationFactory((s: any) => {
    return !(s && /^[0-9]+$/.test(s) && Number.parseInt(s) > 0);
});


export function staticCast<T>(obj: any): T {
    return obj as T;
}

export interface AnyObjProps {
    [index: string]: string;
}

export function makeObjectNull(obj: any) {
    for (let i in obj) {
        if (obj[i] === undefined) {
            obj[i] = null;
        }
    }
}

//entries<T extends { [key: string]: any }, K extends keyof T>(o: T): [keyof T, T[K]][];



export interface Access<T> {
    [index: string]: Map<T[keyof T], { readOnly: boolean, obj: T }>;
}

export class MapWithIndexes<T> {
    private access: Access<T> = {};
    constructor(primary: keyof T, ...rest: (keyof T)[]) {
        this.access[primary] = new Map<T[keyof T], { readOnly: boolean, obj: T }>();
        for (let key of rest) {
            this.access[key] = new Map<T[keyof T], { readOnly: boolean, obj: T }>();
        }
    }

    public values(): T[] {
        let rc: T[] = [];
        for (let firstKey in this.access) {
            return Array.from(this.access[firstKey].values()).map((wrap) => {
                return wrap.obj;
            });

        }
        return rc;
    }

    public clear() {
        let allKeys = Object.keys(this.access) as [keyof T];
        allKeys.forEach((key) => {
            this.access[key].clear();
        });
    }


    //store a copy
    public set(data: T, readOnly: boolean = false) {

        if (!data) {
            let err = 'data argument is undefined';
            //logger.error(err);
            throw new Error(err);
        }
        let _rc = JSON.parse(JSON.stringify(data)) as T;

        for (let key in this.access) {
            let keyValue = _rc[key as keyof T];
            let exist = this.access[key].get(keyValue);
            if (exist && exist.readOnly) {
                break;
            }
            this.access[key].set(keyValue, { readOnly, obj: _rc });
        }
    }



    public remove(data: T /* might be 'Partial' forced by caller*/): boolean {

        let searchKeys = Object.keys(data).filter((key) => {
            return key in this.access;
        });

        if (!searchKeys.length) {
            return false;
        }

        let indexedObjects = (searchKeys as (keyof T)[]).reduce((col, key) => {
            let itm = this.access[key].get(data[key]);
            if (itm) {
                col[key] = itm.obj;
            }
            return col;
        }, {} as { [index: string]: T });
        //
        // check it must all be the same object
        //
        let ok = true;
        outer:
        for (let i = 0; i < searchKeys.length; i++) {
            for (let j = i + 1; j < searchKeys.length; j++) {
                if (indexedObjects[searchKeys[i]] !== indexedObjects[searchKeys[j]]) {
                    ok = false;
                    break outer;
                }
            }
        }
        if (!ok) {
            return false;
        }
        //pick one, its all has been checked to be the same object anyway
        let obj: T = indexedObjects[searchKeys[0]];
        for (let key in this.access) {
            let keyValue = obj[key as keyof T];
            this.access[key].delete(keyValue as any);
        }
        return true;
    }

    //get a copy not the reference
    public get(by: keyof T, keyValue: T[keyof T]): T | undefined {
        let map = this.access[by];
        if (map === undefined) {
            throw new Error(util.format('nothing is indexed by key %s', by));
        }
        let _rc = map.get(keyValue);
        if (_rc) {
            _rc = JSON.parse(JSON.stringify(_rc));
        }
        return _rc && _rc.obj;
    }

    public get stats() {
        let allKeys = Object.keys(this.access) as [keyof T];
        let _stats = allKeys.reduce((prev, key) => {
            let map = this.access[key];
            prev.push(`Nr of items in key ${key} is ${map.size}`);
            return prev;
        }, [] as string[]);
        return _stats.join(', ');
    }

    public prettyPrint() {
        //collect all properties first
        let firstPick = Object.keys(this.access)[0];
        let firstMap = this.access[firstPick];
        let stats = Array.from(firstMap.values()).reduce((prev, itm) => {
            for (let prop in itm.obj) {
                prev[prop] = prev[prop] || 0;
                prev[prop] = Math.max(prev[prop], String(itm.obj[prop]).length);
                console.log(prop, String(itm.obj[prop]), String(itm.obj[prop]).length);
            }
            return prev;
        }, {} as { [index: string]: number; });
        return String(util.inspect(stats));
    }

    public get length() {
        for (let firstPick in this.access) {
            return this.access[firstPick].size;
        }
        return 0;
    }
}

export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}


export function loadFiles<T>(files: T): Promise<T> {

    let fileNameAliases = Object.keys(files) as (keyof T)[];
    let toDo = fileNameAliases.length;
    let errCount = 0;

    if (toDo === 0) {
        return Promise.resolve({} as T);
    }

    let results: T = {} as T;

    return new Promise<T>((resolve) => {
        fileNameAliases.forEach((fileNameAlias: keyof T) => {
            let fileName = files[fileNameAlias];
            fs.readFile(String(fileName), { flag: 'r', encoding: 'utf8' }, (err: NodeJS.ErrnoException, data) => {
                toDo--;
                if (err) {
                    results[fileNameAlias] = err as any;
                    errCount++;
                }
                else {
                    results[fileNameAlias] = data as any;
                }
                if (toDo === 0) {
                  return resolve(results);
                }
            });
        });
    });
}
