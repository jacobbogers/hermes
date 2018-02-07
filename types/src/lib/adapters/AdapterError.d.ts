import { ADAPTER_STATE } from './state';
export declare class AdapterError extends Error {
    private _adaptorState;
    constructor(message: string, code: ADAPTER_STATE);
    getStateStr(): string;
    toString(): string;
}
