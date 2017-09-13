import { ADAPTOR_STATE } from './adaptor_state';

export interface IStateTransition {
    from: ADAPTOR_STATE[];
    to: ADAPTOR_STATE[];
}
