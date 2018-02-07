export declare class OperationResult<I> {
    private _inserted;
    private _errors;
    private _collected;
    private _deleted;
    readonly deleted: number | undefined;
    readonly inserted: number | undefined;
    readonly errors: number;
    readonly collected: I[] | undefined;
    readonly first: I | undefined;
    constructor(props: {
        inserted?: number;
        errors: number;
        collected?: I[];
        deleted?: number;
    });
}
