
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

export class OperationResult<I> {
    private _inserted: number | undefined;
    private _errors = 0;
    private _collected: I[] | undefined;
    private _deleted: number | undefined;
    get inserted() {
        return this._inserted;
    }
    get errors() {
        return this._errors;
    }
    get collected(): I[] | undefined {
        return this._collected;
    }
    get first(): I | undefined {
        return this._collected && this._collected[0];
    }
    constructor(props: { inserted?: number, errors: number, collected?: I[], deleted?: number }) {
        this._inserted = props.inserted;
        this._errors = props.errors;
        this._deleted = props.deleted;
        this._collected = props.collected && props.collected.splice(0);
    }

}

export function flatMap<T, F extends { obj: T }, Mc extends Map<T[keyof T], Mc | F>>(map: Mc): F[] {
    let rc: F[] = [];
    for (const itm of map.values()) {
        if (itm instanceof Map) {
            let rc2 = flatMap(itm);
            rc.push(...(rc2 as F[]));
            continue;
        }
        rc.push(itm);
    }
    return rc;
}

export class MapWithIndexes<T, K extends keyof T, F extends { readOnly: boolean, obj: T }, Me extends Map<T[K], F>, Mc extends Map<T[K], Mc | Me>> {

    private access: { [index: string]: Map<T[K], F | Mc | Me> } = {};

    private flatMap(map: Mc): { readOnly: boolean, obj: T }[] {
        let rc = [];
        for (let itm of map.values()) {
            if (itm instanceof Map) {
                let rc2 = this.flatMap(<Mc>itm);
                rc.push(...rc2);
                continue;
            }
            rc.push(itm);
        }
        return rc;
    }

    constructor(...composites: ((keyof T)[])[]) {

        for (let composite of composites) {
            let masterKey = composite.join('#');
            this.access[masterKey] = new Map<T[K], F | Mc | Me>();
        }
    }

    public values(): T[] {
        for (let firstKey in this.access) {
            let objs = this.flatMap(<Mc>(this.access[firstKey]));
            return objs.map((obj) => obj.obj);
        }
        return [];
    }

    public clear() {
        for (let key in this.access) {
            this.access[key].clear();
        }
    }

    // store a copy

    public set(data: T, readOnly: boolean = false): OperationResult<T> {
        let inserted = 0;
        let errors = 0;
        if (!data) {
            let err = 'data argument is undefined';
            throw new Error(err);
        }
        let dataCopy = JSON.parse(JSON.stringify(data)) as T;
        for (let composite in this.access) {
            let currentMap = this.access[composite];
            let path: (keyof T)[] = composite.split('#') as any;
            nextComposite:
            do {
                let keyName = path.shift();
                if (!keyName) {
                    errors++;
                    break;
                }
                if (!(keyName in dataCopy)) {
                    errors++;
                    break;
                }
                let keyValue = dataCopy[keyName];
                let peek = currentMap.get(keyValue);

                // premature termination of structure , composite key larger then structure
                if (path.length === 0 && (peek instanceof Map)) {
                    errors++;
                    break;
                }

                // premature termination of key, structure extends beyond key
                if (peek !== undefined && !(peek instanceof Map) && path.length > 0) {
                    errors++;
                    break;
                }
                // walk up the tree
                if (peek instanceof Map && path.length > 0) {
                    currentMap = peek;
                    continue;
                }
                // "peek" variable is either undefined or NOT a Map object
                switch (true) {
                    // set new
                    case (peek === undefined && path.length === 0): // dont even try (!peek && !path.length) seriously!!
                        let newRecord = <F>{ readOnly, obj: dataCopy }; // = { readOnly: true, obj: data };
                        currentMap.set(keyValue, newRecord);
                        inserted++;
                        break;
                    // set replace
                    case (peek !== undefined && path.length === 0): // previous inserted object found, optionally override
                        let finalObj = <F>(peek);
                        if (!finalObj.readOnly) {
                            finalObj.readOnly = readOnly;
                            finalObj.obj = dataCopy;
                            currentMap.set(keyValue, finalObj);
                            inserted++;
                        }
                        break;
                    // set add path
                    case (peek === undefined && path.length > 0): // create extra path (inserting new objects)
                        let map = <Mc>(new Map());
                        currentMap.set(keyValue, map);
                        currentMap = map;
                        break;
                    default:
                        errors++;
                        break nextComposite;

                }
            } while (path.length && currentMap);
        }
        return new OperationResult<T>({ errors, inserted });
    }

    public delete(data: T): OperationResult<T> {
        if (!data) {
            let err = 'data argument is undefined';
            throw new Error(err);
        }
        let dataCopy = JSON.parse(JSON.stringify(data)) as T;

        let deleted = 0;
        let errors = 0;

        for (let composite in this.access) {
            let currentMap = this.access[composite];
            let path: (keyof T)[] = composite.split('#') as any;

            do {
                let keyName = path.shift();
                if (!keyName) {
                    errors++;
                    break;
                }
                if (!(keyName in dataCopy)) {
                    errors++;
                    break;
                }
                let keyValue = dataCopy[keyName];
                let peek = currentMap.get(keyValue);
                // premature termination of structure , composite key larger then structure
                if (path.length && peek && !(peek instanceof Map)) {
                    errors++;
                    break;
                }
                // premature termination of path, composite key shorter then structure
                if (peek instanceof Map && !path.length) {
                    errors++;
                    break;
                }
                if (peek instanceof Map) {
                    currentMap = peek;
                    continue;
                }//
                // found something to delete
                if (peek) {
                    currentMap.delete(keyValue);
                    deleted++;
                }
            } while (path.length && currentMap);
        }
        return new OperationResult<T>({ errors, deleted });

    }

    public get(queryObject: Partial<T>): OperationResult<T> {
        if (!queryObject) {
            let err = 'data argument is undefined';
            throw new Error(err);
        }
        let query = JSON.parse(JSON.stringify(queryObject)) as Partial<T>;
        let qNames = Object.getOwnPropertyNames(query);
        let errors = 0;
        let collected: T[] = [];

        let selected: string | undefined = undefined;
        for (let composites in this.access) {
            let paths = composites.split('#');

            paths.reverse(); // because i want to ise "fromIndex" argument in [].findIndex(..);

            if (paths.length < qNames.length) {
                continue;
            }
            // contains at least all MY names
            if (qNames.slice(0).filter((name) => paths.indexOf(name, paths.length - qNames.length) >= 0).length === qNames.length) {
                // the shortest one
                selected = selected || composites;
                if (paths.length < selected.split('#').length) {
                    selected = composites;
                }
            }
        }
        // so after all this we have the composite path that is the best fit or no fit at all
        if (!selected) {
            throw new Error(util.format('the  query %j object doesnt match any of the composite paths', query));
        }

        let currentMap = this.access[selected];

        let spath: (keyof T)[] = selected.split('#') as any;
        // let parentMap = currentMap; // init dummy value
        do {
            let keyName = spath.shift(); // pop
            if (!keyName) { // very bad
                errors++;
                break;
            }
            if (!(keyName in query)) {// the rest is *wildcard*
                spath.unshift(keyName); // put it back to be processed later;
                // currentMap = parentMap;
                break;
            }
            let keyValue = query[keyName] as T[K];
            let peek = currentMap.get(keyValue);
            if (!peek) { // not found regardless
                errors++;
                break;
            }
            // premature termination of structure , composite key larger then structure
            if (spath.length && peek && !(peek instanceof Map)) {
                errors++;
                break;
            }
            // premature termination of path, composite key shorter then structure
            if (peek instanceof Map && !spath.length) {
                errors++;
                break;
            }
            if (peek instanceof Map) {
                // parentMap = currentMap;
                currentMap = peek;
                continue;
            }//
            // at the end
            if (peek && !spath.length) {
                collected.push(deepClone(peek.obj));
            }
        } while (spath.length && currentMap);
        if (spath.length === 0) {
            return new OperationResult<T>({ errors, collected });
        }
        // wildcard search from here collect everything in this map

        let rc = flatMap(currentMap).map((itm) => deepClone(itm.obj)) as T[];
        collected.push(...rc);
        return new OperationResult({ errors, collected });

    }

    public length() {
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

export function makeValueslowerCase<I>(obj: I, ...props: (keyof I)[]) {
    for (let prop of props) {
        if (typeof (obj[prop]) === 'string') {
            const value: string = obj[prop] as any;
            obj[prop] = value.toLocaleLowerCase() as any;
        }
    }
}
