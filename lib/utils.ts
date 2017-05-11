

import * as util from 'util';

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
    [index: string]: Map<T[keyof T], T>;
}

export class MapWithIndexes<T> {
    private access: Access<T> = {};
    constructor(primary: keyof T, ...rest: (keyof T)[]) {
        this.access[primary] = new Map<T[keyof T], T>();
        for (let key of rest) {
            this.access[key] = new Map<T[keyof T], T>();
        }
    }

    public values(): T[] {
        let rc: T[] = [];
        for (let firstKey in this.access) {
            return Array.from(this.access[firstKey].values());
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
    public set(data: T) {

        if (!data) {
            let err = 'data argument is undefined';
            //logger.error(err);
            throw new Error(err);
        }
        let _rc = JSON.parse(JSON.stringify(data));

        for (let key in this.access) {
            let keyValue = _rc[key];
            //console.log('key found', key, keyValue);
            this.access[key].set(keyValue, _rc);
        }
    }


    public remove(data: T) {
        for (let key in this.access) {
            let keyValue = data[key as keyof T];
            this.access[key].delete(keyValue);
        }
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
        return _rc;
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
            for (let prop in itm) {
                prev[prop] = prev[prop] || 0;
                prev[prop] = Math.max(prev[prop], String(itm[prop]).length);
                console.log(prop, String(itm[prop]), String(itm[prop]).length);
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

