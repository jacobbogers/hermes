import { ADAPTOR_STATE } from '~states';
import { AdaptorError } from './AdaptorError';
/* make it a warning */
export class AdaptorWarning extends AdaptorError {
    public constructor(message: string, code: ADAPTOR_STATE) {
        super(message, code);
        this.name = 'AdaptorWarning';
    }
}
