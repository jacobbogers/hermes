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
    constructor(props: {
        inserted?: number;
        errors: number;
        collected?: I[];
        deleted?: number;
    }) {
        this._inserted = props.inserted;
        this._errors = props.errors;
        this._deleted = props.deleted;
        this._collected = props.collected && props.collected.splice(0);
    }
}
