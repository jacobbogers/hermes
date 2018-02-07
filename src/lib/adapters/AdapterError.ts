import { ADAPTER_STATE } from './state';

export class AdapterError extends Error {
    private _adaptorState: ADAPTER_STATE;

    public constructor(message: string, code: ADAPTER_STATE) {
        super(message);
        this.name = 'AdapterError';
        this._adaptorState = code;
    }

    public getStateStr() {
        return ADAPTER_STATE[this._adaptorState];
    }

    public toString() {
        return `${this.name}: (state: ${this.getStateStr()}) ${this.message}`;
    }
}
