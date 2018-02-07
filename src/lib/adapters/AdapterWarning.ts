import { AdapterError } from './AdapterError';
import { ADAPTER_STATE } from './state';
/* make it a warning */
export class AdaptorWarning extends AdapterError {
    public constructor(message: string, code: ADAPTER_STATE) {
        super(message, code);
        this.name = 'AdaptorWarning';
    }
}
