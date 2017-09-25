'use strict';

import * as EventEmitter from 'events';
import * as util from 'util';
import { AdaptorError } from './AdaptorError';
import { AdaptorWarning } from './AdaptorWarning';

import { Logger } from '~lib/logger';
const logger = Logger.getLogger();

import { IPropertiesModifyMessage } from '~properties/IPropertiesModifyMessage';
import { IStateTransition } from '~states/IStateTransition.ts';
import { ITemplatePropsMessage } from '~templates/ITemplatePropsMessage';
import { ITokenMessage } from '~tokens/ITokenMessage';
import { ITokenMessageReturned } from '~tokens/ITokenMessageReturned';
import { SystemInfo } from '../system';

import { ITokenPropertiesModifyMessageReturned } from '~tokens/ITokenPropertiesModifyMessageReturned';

import { ITokensAndPropsMessage } from '~tokens/ITokensAndPropsMessage';
import { IUserMessageBase } from '~users/IUserMessageBase';
import { IUserMessageReturned } from '~users/IUserMessageReturned';
import { IUserPropertiesModifyMessageReturned } from '~users/IUserPropertiesModifyMessageReturned';

import { IUsersAndPropsMessage } from '~users/IUsersAndPropsMessage';

import { ADAPTOR_STATE } from '~states/adaptor_state';

const transitions: IStateTransition[] = [
    {
        from: [ADAPTOR_STATE.ERR_Initializing, ADAPTOR_STATE.ERR_Connecting],
        to: [ADAPTOR_STATE.Initializing]
    },
    {
        from: [ADAPTOR_STATE.UnInitialized],
        to: [ADAPTOR_STATE.Initializing]
    },
    {
        from: [ADAPTOR_STATE.Initializing],
        to: [ADAPTOR_STATE.Initialized]
    },
    {
        from: [ADAPTOR_STATE.Initialized],
        to: [ADAPTOR_STATE.Connecting]
    },
    {
        from: [ADAPTOR_STATE.Connecting],
        to: [ADAPTOR_STATE.Connected]
    },
    {
        from: [ADAPTOR_STATE.Connected],
        to: [ADAPTOR_STATE.Disconnecting]
    },
    {
        from: [ADAPTOR_STATE.Connected],
        to: [ADAPTOR_STATE.Disconnected]
    },
    {
        from: [ADAPTOR_STATE.Initializing],
        to: [ADAPTOR_STATE.ERR_Initializing]
    },
    {
        from: [ADAPTOR_STATE.Connecting],
        to: [ADAPTOR_STATE.ERR_Connecting]
    }
];

function moveToState(src: ADAPTOR_STATE, target: ADAPTOR_STATE): boolean {
    if (src === target) {
        return true;
    }
    const allowed = transitions.filter(t => {
        if (t.to.length === 1 && t.to.indexOf(target) >= 0) {
            if (t.from.indexOf(src) >= 0) {
                return true;
            }
        }

        return false;
    });
    if (allowed.length > 0) {
        return true;
    }

    return false;
}

let _adaptor: AdaptorBase | undefined;
// Let _errors: string[] = [];
// Let _warnings: string[] = [];

export abstract class AdaptorBase extends EventEmitter {
    public get adaptor(): AdaptorBase | undefined {
        return _adaptor;
    }

    public get errs(): string[] {
        return SystemInfo.createSystemInfo()
            .systemErrors<AdaptorError>(null, AdaptorError)
            .map(String);
    }

    public get warns(): string[] {
        return SystemInfo.createSystemInfo()
            .systemWarnings<AdaptorWarning>(null, AdaptorError)
            .map(String);
    }

    private _state: ADAPTOR_STATE = ADAPTOR_STATE.UnInitialized;

    public constructor() {
        super();
        const thisClassName = this.constructor.name;
        logger.info('Attempt to initialize %s', thisClassName);
        if (_adaptor !== undefined) {
            const adaptorClassName = _adaptor.constructor.name;
            _adaptor.addErr(
                '[adaptor] property on [%s] class is not null or undefined',
                thisClassName
            );
            _adaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
            logger.error(_adaptor.lastErr());
            throw new Error(
                util.format(
                    'Adaptor of type %s already created,' +
                        ' cannot create this new instance of %s',
                    adaptorClassName,
                    thisClassName
                )
            );
        }
        _adaptor = this;
    }

    public async destroy(alwaysReject?: boolean): Promise<boolean> {
        if (!this.transition(ADAPTOR_STATE.Disconnecting)) {
            this.addErr('Could not transition to state [disconnecting]');

            return Promise.reject(false);
        }

        return alwaysReject ? Promise.reject(false) : Promise.resolve(true);
    }

    public get state(): ADAPTOR_STATE {
        return this._state;
    }

    /* general */
    public abstract init(): Promise<boolean>;
    public abstract get poolSize(): number;
    public abstract shutDown(): Promise<boolean>;
    /* user */
    public abstract userInsert(
        token: IUserMessageBase
    ): Promise<IUserMessageReturned>;

    public abstract userInsertModifyProperty(
        userId: number,
        modifications: IPropertiesModifyMessage[]
    ): Promise<IUserPropertiesModifyMessageReturned[]>;

    public abstract userSelectByFilter(): Promise<IUsersAndPropsMessage[]>;

    /*Tokens*/
    public abstract tokenInsertModify(
        token: ITokenMessage
    ): Promise<ITokenMessageReturned>;

    public abstract tokenInsertModifyProperty(
        tokenId: string,
        modifications: IPropertiesModifyMessage[]
    ): Promise<ITokenPropertiesModifyMessageReturned[]>;

    public abstract tokenAssociateWithUser(
        tokenId: string,
        userId: number
    ): Promise<boolean>;

    public abstract tokenInsertRevoke(
        fkUserId: number,
        purpose: string,
        ipAddr: string,
        revokeReason: string
    ): Promise<ITokenMessageReturned>;

    public abstract tokenGC(deleteOlderThen: number): Promise<number>;

    public abstract tokenSelectAllByFilter(
        timestampExpire: number | null,
        startTimestampRevoked: number,
        endTimestampRevoked: number
    ): Promise<ITokensAndPropsMessage[]>;

    public abstract tokenSelectAllByUserIdOrName(
        userId: number | null,
        userName: string | null
    ): Promise<ITokensAndPropsMessage[]>;

    /* templates */
    public abstract templateSelectAll(): Promise<ITemplatePropsMessage[]>;

    public abstract get connected(): boolean;

    protected lastErr(): string {
        return String(SystemInfo.createSystemInfo().lastErr(AdaptorError));
    }

    protected transition(target: ADAPTOR_STATE, force?: boolean) {
        const _force = !!force;
        if (!_adaptor) {
            return false;
        }
        if (_force || (!_force && moveToState(_adaptor.state, target))) {
            _adaptor._state = target;

            return true;
        }

        return false;
    }

    protected addErr(message: string | Error, ...rest: any[]) {
        // The last one is the error code
        SystemInfo.createSystemInfo().addError(
            typeof message === 'string'
                ? new AdaptorError(
                      util.format.call(util.format, message, ...rest),
                      this._state
                  )
                : message
        );

        return;
    }
}
