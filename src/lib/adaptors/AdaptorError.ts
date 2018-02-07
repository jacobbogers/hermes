import { ADAPTOR_STATE } from './state';

export class AdaptorError extends Error {
    private _adaptorState: ADAPTOR_STATE;

    public constructor(message: string, code: ADAPTOR_STATE) {
        super(message);
        this.name = 'AdaptorError';
        this._adaptorState = code;
    }

    public getStateStr() {
        return ADAPTOR_STATE[this._adaptorState];
    }

    public toString() {
        return `${this.name}: (state: ${this.getStateStr()}) ${this.message}`;
    }
}
