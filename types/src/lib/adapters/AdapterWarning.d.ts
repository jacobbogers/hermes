import { AdapterError } from './AdapterError';
import { ADAPTER_STATE } from './state';
export declare class AdaptorWarning extends AdapterError {
    constructor(message: string, code: ADAPTER_STATE);
}
