import * as util from 'util';

import { deepClone, flatMap, OperationResult } from '~lib/utils';

export class MapWithIndexes<
    T,
    K extends keyof T,
    F extends { readOnly: boolean; obj: T },
    Me extends Map<T[K], F>,
    Mc extends Map<T[K], Mc | Me>
> {
    private access: { [index: string]: Map<T[K], F | Mc | Me> } = {};

    public constructor(...composites: ((keyof T)[])[]) {
        for (const composite of composites) {
            const masterKey = composite.join('#');
            this.access[masterKey] = new Map<T[K], F | Mc | Me>();
        }
    }

    public values(): T[] {
        for (const firstKey in this.access) {
            if (this.access.hasOwnProperty(firstKey)) {
                const objs = this.flatMap(this.access[firstKey] as Mc);
                return objs.map(obj => obj.obj);
            }
        }
        return [];
    }

    public clear() {
        for (const key in this.access) {
            if (this.access.hasOwnProperty(key)) {
                this.access[key].clear();
            }
        }
    }

    // store a copy

    public set(data: T, readOnly: boolean = false): OperationResult<T> {
        let inserted = 0;
        let errors = 0;
        if (!data) {
            const err = 'data argument is undefined';
            throw new Error(err);
        }
        const dataCopy = JSON.parse(JSON.stringify(data)) as T;
        for (const composite in this.access) {
            if (this.access.hasOwnProperty(composite)) {
                let currentMap = this.access[composite];
                const path: (keyof T)[] = composite.split('#') as any;
                nextComposite: do {
                    const keyName = path.shift();
                    if (!keyName) {
                        errors++;
                        break;
                    }
                    if (!(keyName in dataCopy)) {
                        errors++;
                        break;
                    }
                    const keyValue = dataCopy[keyName];
                    const peek = currentMap.get(keyValue);

                    // premature termination of structure , composite key larger then structure
                    if (path.length === 0 && peek instanceof Map) {
                        errors++;
                        break;
                    }

                    // premature termination of key, structure extends beyond key
                    if (
                        peek !== undefined &&
                        !(peek instanceof Map) &&
                        path.length > 0
                    ) {
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
                        // dont even try (!peek && !path.length) seriously!!
                        case peek === undefined && path.length === 0:
                            // = { readOnly: true, obj: data };
                            const newRecord = { readOnly, obj: dataCopy } as F;
                            currentMap.set(keyValue, newRecord);
                            inserted++;
                            break;
                        // set replace
                        // previous inserted object found, optionally override
                        case peek !== undefined && path.length === 0:
                            const finalObj = peek as F;
                            if (!finalObj.readOnly) {
                                finalObj.readOnly = readOnly;
                                finalObj.obj = dataCopy;
                                currentMap.set(keyValue, finalObj);
                                inserted++;
                            }
                            break;
                        // set add path
                        case peek === undefined && path.length > 0: // create extra path (inserting new objects)
                            const map = new Map() as Mc;
                            currentMap.set(keyValue, map);
                            currentMap = map;
                            break;
                        default:
                            errors++;
                            break nextComposite;
                    }
                } while (path.length && currentMap);
            }
        }
        return new OperationResult<T>({ errors, inserted });
    }

    public delete(data: T): OperationResult<T> {
        if (!data) {
            const err = 'data argument is undefined';
            throw new Error(err);
        }
        const dataCopy = JSON.parse(JSON.stringify(data)) as T;

        let deleted = 0;
        let errors = 0;

        for (const composite in this.access) {
            if (this.access.hasOwnProperty(composite)) {
                let currentMap = this.access[composite];
                const path: (keyof T)[] = composite.split('#') as any;

                do {
                    const keyName = path.shift();
                    if (!keyName) {
                        errors++;
                        break;
                    }
                    if (!(keyName in dataCopy)) {
                        errors++;
                        break;
                    }
                    const keyValue = dataCopy[keyName];
                    const peek = currentMap.get(keyValue);
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
                    } //
                    // found something to delete
                    if (peek) {
                        currentMap.delete(keyValue);
                        deleted++;
                    }
                } while (path.length && currentMap);
            }
        }
        return new OperationResult<T>({ errors, deleted });
    }

    public get(queryObject: Partial<T>): OperationResult<T> {
        if (!queryObject) {
            const err = 'data argument is undefined';
            throw new Error(err);
        }
        const query = JSON.parse(JSON.stringify(queryObject)) as Partial<T>;
        const qNames = Object.getOwnPropertyNames(query);
        let errors = 0;
        const collected: T[] = [];

        let selected: string | undefined;
        for (const composites in this.access) {
            if (this.access.hasOwnProperty(composites)) {
                const paths = composites.split('#');

                paths.reverse(); // because i want to ise "fromIndex" argument in [].findIndex(..);

                if (paths.length < qNames.length) {
                    continue;
                }
                // contains at least all MY names
                if (
                    qNames
                        .slice(0)
                        .filter(
                            name =>
                                paths.indexOf(
                                    name,
                                    paths.length - qNames.length
                                ) >= 0
                        ).length === qNames.length
                ) {
                    // the shortest one
                    selected = selected || composites;
                    if (paths.length < selected.split('#').length) {
                        selected = composites;
                    }
                }
            }
        }
        // so after all this we have the composite path that is the best fit or no fit at all
        if (!selected) {
            throw new Error(
                util.format(
                    'the  query %j object doesnt match any of the composite paths',
                    query
                )
            );
        }

        let currentMap = this.access[selected];

        const spath: (keyof T)[] = selected.split('#') as any;
        // let parentMap = currentMap; // init dummy value
        do {
            const keyName = spath.shift(); // pop
            if (!keyName) {
                // very bad
                errors++;
                break;
            }
            if (!(keyName in query)) {
                // the rest is *wildcard*
                spath.unshift(keyName); // put it back to be processed later;
                // currentMap = parentMap;
                break;
            }
            const keyValue = query[keyName] as T[K];
            const peek = currentMap.get(keyValue);
            if (!peek) {
                // not found regardless
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
            } //
            // at the end
            if (peek && !spath.length) {
                collected.push(deepClone(peek.obj));
            }
        } while (spath.length && currentMap);
        if (spath.length === 0) {
            return new OperationResult<T>({ errors, collected });
        }
        // wildcard search from here collect everything in this map

        const rc = flatMap(currentMap).map(itm => deepClone(itm.obj)) as T[];
        collected.push(...rc);
        return new OperationResult({ errors, collected });
    }

    public length() {
        for (const firstPick in this.access) {
            if (this.access.hasOwnProperty(firstPick)) {
                return this.access[firstPick].size;
            }
        }
        return 0;
    }

    private flatMap(map: Mc): { readOnly: boolean; obj: T }[] {
        const rc = [];
        for (const itm of map.values()) {
            if (itm instanceof Map) {
                const rc2 = this.flatMap(itm as Mc);
                rc.push(...rc2);
                continue;
            }
            rc.push(itm);
        }
        return rc;
    }
}
