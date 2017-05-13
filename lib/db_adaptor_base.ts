'use strict';

import * as EventEmitter from 'events';
import * as util from 'util';
import { logger } from './logger';

export class AdaptorError extends Error {
    private _adaptorState: ADAPTOR_STATE;
    public get adaptorState() {
        return this._adaptorState;
    }
    constructor(message: string, code: ADAPTOR_STATE) {
        super(message);
        this.message = message;
        this.name = 'AdaptorError';
        this._adaptorState = code;
    }
}

/* general */

export interface PropertiesModifyMessage {
    propName: string;
    propValue: string;
    invisible: boolean;
}

/* users */

export interface UserPropertiesModifyMessageReturned extends PropertiesModifyMessage {
    fkUserId: number;
}

export interface UserMessageBase {
    userName: string;
    userEmail: string;
}

export interface UserMessageReturned extends UserMessageBase {
    userId: number;
}

export interface UsersAndPropsMessage {
    userId: number;
    userName: string;
    userEmail: string;
    propName: string;
    propValue: string;
}


/* tokens */

export interface TokenMessageBase {
    tokenId: string;
    fkUserId: number | null;
    purpose: string | null;
    ipAddr: string | null;
    tsIssuance: number;
    tsRevoked: number | null;
    revokeReason: string | null;
    tsExpire: number;
}

export interface TokenMessage extends TokenMessageBase {
    templateName: string | null;
}

export interface TokenMessageReturned extends TokenMessageBase {
    templateId: number | null;
}


export interface TokenPropertiesModifyMessageReturned extends PropertiesModifyMessage {
    fkTokenId: string;
}


/* users and tokens */

export interface TokensAndPropsMessage extends TokenMessage {
    // overrides
    tokenId: string;
    fkUserId: number;
    tsIssuance: number;
    tsExpire: number;
    //extras
    usrName: string;
    usrEmail: string;
    blackListed: boolean; //its a repeat but ok
    tsRevoked: number | null;
    revokeReason: string | null;
    sessionPropName: string;
    sessionPropValue: string;
    propName: string;
    propValue: string;
}

/* template */

export interface TemplatePropsMessage {
    id: number;
    cookieName: string;
    path: string;
    maxAge: number;
    httpOnly: boolean;
    secure: boolean;
    domain: string;
    sameSite: boolean;
    rolling: boolean;
    templateName: string;
}

/* state machine , for tear-down and startup of database adaptor */
/* state machine , for tear-down and startup of database adaptor */
/* state machine , for tear-down and startup of database adaptor */

export enum ADAPTOR_STATE {
    UnInitialized = 0,
    Initializing,
    Initialized,
    Connecting,
    Connected,
    Disconnecting,
    Disconnected,
    ERR_Initializing,
    ERR_Connecting,
}

interface StateTransition {
    from: ADAPTOR_STATE[];
    to: ADAPTOR_STATE[];
}

const transitions: StateTransition[] = [
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

    let allowed = transitions.filter((t) => {
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


let _adaptor: AdaptorBase;
let _errors: string[] = [];
let _warnings: string[] = [];


export abstract class AdaptorBase extends EventEmitter {


    public get adaptor(): AdaptorBase {
        return _adaptor;
    }

    public get errors(): string[] {
        return _errors;
    }

    public get warnings(): string[] {
        return _warnings;
    }

    protected _state: ADAPTOR_STATE = ADAPTOR_STATE.UnInitialized;

    protected addErr(...rest: any[]) {
        _errors.push(util.format.call(util.format, ...rest));
    }

    protected lastErr(): string {
        return _errors[_errors.length - 1];
    }

    constructor() {
        super();
        let thisClassName = this.constructor.name;
        logger.info('Attempt to initialize %s', thisClassName);
        if (_adaptor !== undefined) {
            let adaptorClassName = _adaptor.constructor.name;
            _adaptor.addErr(util.format('[adaptor] property on [%s] class is not null or undefined', thisClassName));
            _adaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
            logger.error(_adaptor.lastErr());
            throw new Error(util.format('Adaptor of type %s already created, cannot create this new instance of %s', adaptorClassName, thisClassName));
        }
        _adaptor = this;
    }

    protected transition(target: ADAPTOR_STATE, force?: boolean) {
        force = !!force;
        if (force || (!force && moveToState(_adaptor.state, target))) {
            _adaptor._state = target;
            return true;
        }
        return false;
    }

    public destroy(): Promise<boolean> {
        if (!this.transition(ADAPTOR_STATE.Disconnecting)) {
            _errors.push('Could not transition to state [disconnecting]');
            return Promise.reject(false);
        }
        return Promise.resolve(true);
    }

    public get state(): ADAPTOR_STATE {
        return this._state;
    }
   
    /* general */
    public abstract init(): Promise<boolean>;
    public abstract get poolSize(): number;
    /* user */
    public abstract userInsertModify(token: UserMessageBase): Promise<UserMessageReturned>;
    public abstract userInsertModifyProperty(userId: number, modifications: PropertiesModifyMessage[]): Promise<UserPropertiesModifyMessageReturned[]>;
    public abstract userSelectByFilter(notHavingProp?: string): Promise<UsersAndPropsMessage[]>;
    /*tokens*/
    public abstract tokenInsertModify(token: TokenMessage): Promise<TokenMessageReturned>;
    public abstract tokenInsertModifyProperty(tokenId: string, modifications: PropertiesModifyMessage[]): Promise<TokenPropertiesModifyMessageReturned[]>;
    public abstract tokenAssociateWithUser(tokenId: string, userId: number): Promise<boolean>;
    public abstract tokenDoExpire(tokenId: string, expireReason: string, expireTime?: number | null): Promise<boolean>;
    public abstract tokenGC(deleteBeforeExpireTime: number): Promise<number>;
    public abstract tokenSelectAllByFilter(timestampExpire: number | null, startTimestampRevoked: number, endTimestampRevoked: number): Promise<TokensAndPropsMessage[]>;
    public abstract tokenSelectAllByUserIdOrName(userId: number | null, userName: string | null): Promise<TokensAndPropsMessage[]>;
    /* templates */
    public abstract templateSelectAll(): Promise<TemplatePropsMessage[]>;

    public abstract get connected(): boolean;

}
