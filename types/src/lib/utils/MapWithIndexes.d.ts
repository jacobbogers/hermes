import { OperationResult } from './';
export declare function index<T>(...composites: ((keyof T)[])[]): MapWithIndexes<T, any, any, any, any>;
export declare class MapWithIndexes<T, K extends keyof T, F extends {
    readOnly: boolean;
    obj: T;
}, Me extends Map<T[K], F>, Mc extends Map<T[K], Mc | Me>> {
    private access;
    constructor(...composites: ((keyof T)[])[]);
    values(): T[];
    clear(): void;
    set(data: T, readOnly?: boolean): OperationResult<T>;
    delete(data: T): OperationResult<T>;
    get(queryObject: Partial<T>): OperationResult<T>;
    length(): number;
    private flatMap(map);
}
