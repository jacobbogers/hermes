export class OperationResult<I> {

    private _inserted: number | undefined;
    private _errors = 0;
    private _collected: I[] | undefined;
    private _deleted: number | undefined;

    public get inserted() {
        return this._inserted;
    }

    public get errors() {
        return this._errors;
    }

    public get collected(): I[] | undefined {
        return this._collected;
    }

    public get first(): I | undefined {
        return this._collected && this._collected[0];
    }

    public constructor(props: {
        inserted?: number;
        errors: number;
        collected?: I[];
        deleted?: number;
    }) {
        this._inserted = props.inserted;
        this._errors = props.errors;
        this._deleted = props.deleted;
        if (props.collected) this._collected = props.collected.slice(0);
    }
}
