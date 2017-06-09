'use strict';

import * as EventEmitter from 'events';
import * as util from 'util';

import Logger from './logger';
const logger = Logger.getLogger();

import { SystemInfo } from './system';


export const DB_STR_BLACKLISTED = 'BLACKLISTED';

export class AdaptorError extends Error {
    private _adaptorState: ADAPTOR_STATE;

    constructor(message: string, code: ADAPTOR_STATE) {
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

/* make it a warning */
export class AdaptorWarning extends AdaptorError {
    constructor(message: string, code: ADAPTOR_STATE) {
        super(message, code);
        this.name = 'AdaptorWarning';
    }
    public toString(): string {
        return `${this.name}: (state: ${this.getStateStr()}) ${this.message}`;
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
    tsExpireCache: number;
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
    sessionPropName: string | null;
    sessionPropValue: string | null;
    propName: string | null;
    propValue: string | null;
}

/* template */

export interface TemplatePropsMessage {
    id: number;
    cookieName: string;
    path: string | null;
    maxAge: number | null;
    httpOnly: boolean | null;
    secure: boolean | null;
    domain: string | null;
    sameSite: boolean | null;
    rolling: boolean | null;
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

    if (src === target) {
        return true;
    }
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
//let _errors: string[] = [];
//let _warnings: string[] = [];


export abstract class AdaptorBase extends EventEmitter {


    public get adaptor(): AdaptorBase {
        return _adaptor;
    }

    public get errs(): string[] {
        return SystemInfo.createSystemInfo().systemErrors<AdaptorError>(null, AdaptorError).map((err) => String(err));
    }

    public get warns(): string[] {
        return SystemInfo.createSystemInfo().systemWarnings<AdaptorWarning>(null, AdaptorError).map((warn) => String(warn));
    }

    private _state: ADAPTOR_STATE = ADAPTOR_STATE.UnInitialized;

    protected addErr(message: string | Error, ...rest: any[]) {
        //the last one is the error code
        SystemInfo.createSystemInfo().addError(
            typeof message === 'string' ? new AdaptorError(util.format.call(util.format, message, ...rest), this._state) : message
        );
        return;
    }

    protected lastErr(): string {
        return String(SystemInfo.createSystemInfo().lastErr(AdaptorError));
    }

    constructor() {
        super();
        let thisClassName = this.constructor.name;
        logger.info('Attempt to initialize %s', thisClassName);
        if (_adaptor !== undefined) {
            let adaptorClassName = _adaptor.constructor.name;
            _adaptor.addErr('[adaptor] property on [%s] class is not null or undefined', thisClassName);
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

    public destroy(alwaysReject?: boolean): Promise<boolean> {
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
    /* user */
    public abstract userInsert(token: UserMessageBase): Promise<UserMessageReturned>;
    public abstract userInsertModifyProperty(userId: number, modifications: PropertiesModifyMessage[]): Promise<UserPropertiesModifyMessageReturned[]>;
    public abstract userSelectByFilter(): Promise<UsersAndPropsMessage[]>;
    /*tokens*/
    public abstract tokenInsertModify(token: TokenMessage): Promise<TokenMessageReturned>;
    public abstract tokenInsertModifyProperty(tokenId: string, modifications: PropertiesModifyMessage[]): Promise<TokenPropertiesModifyMessageReturned[]>;
    public abstract tokenAssociateWithUser(tokenId: string, userId: number): Promise<boolean>;
    public abstract tokenDoRevoke(tokenId: string, revokeReason: string, revokeTime?: number | null): Promise<boolean>;
    public abstract tokenGC(deleteOlderThen: number): Promise<number>;
    public abstract tokenSelectAllByFilter(timestampExpire: number | null, startTimestampRevoked: number, endTimestampRevoked: number): Promise<TokensAndPropsMessage[]>;
    public abstract tokenSelectAllByUserIdOrName(userId: number | null, userName: string | null): Promise<TokensAndPropsMessage[]>;
    /* templates */
    public abstract templateSelectAll(): Promise<TemplatePropsMessage[]>;

    public abstract get connected(): boolean;

}
