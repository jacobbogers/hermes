import * as debug from 'debug';
import { EventEmitter } from 'events';
import { includes } from 'lodash';

import { Template, Token, TokenProp, User, UserProp } from '../adaptors/types';
//import { SystemInfo } from '../system';
import { AdaptorError } from './AdaptorError';
import { ADAPTOR_STATE } from './state';

const legalTransitions = [
    {
        from: [
            ADAPTOR_STATE.ERR_Initializing,
            ADAPTOR_STATE.ERR_Connecting,
            ADAPTOR_STATE.UnInitialized,
            ADAPTOR_STATE.Disconnected
        ],
        to: [ADAPTOR_STATE.Initializing]
    },
    {
        from: [ADAPTOR_STATE.Initializing],
        to: [
            ADAPTOR_STATE.Initialized,
            ADAPTOR_STATE.ERR_Initializing
        ]
    },
    {
        from: [
            ADAPTOR_STATE.Initialized
        ],
        to: [
            ADAPTOR_STATE.Connecting
        ]
    },
    {
        from: [
            ADAPTOR_STATE.Connecting,
            ADAPTOR_STATE.Initialized
        ],
        to: [
            ADAPTOR_STATE.Connected,
            ADAPTOR_STATE.ERR_Connecting
        ]
    },
    {
        from: [
            ADAPTOR_STATE.Connected
        ],
        to: [
            ADAPTOR_STATE.Disconnecting
        ]
    },
    {
        from: [
            ADAPTOR_STATE.Connected,
            ADAPTOR_STATE.Disconnecting
        ],
        to: [
            ADAPTOR_STATE.Disconnected
        ]
    }
];

function moveToState(src: ADAPTOR_STATE, target: ADAPTOR_STATE): ADAPTOR_STATE {

    if (src === target) {
        return target;
    }

    const result = legalTransitions.find(
        t => includes(t.from, src) && includes(t.to, target)
    );

    if (!result) {
        throw new Error(`Illegal transition, from:${ADAPTOR_STATE[src]} to: ${ADAPTOR_STATE[target]}`);
    }

    return target;
}

let _adaptorInUse: AdaptorBase | undefined;

const printer = debug('Adaptor-base');

export abstract class AdaptorBase extends EventEmitter {

    private internalState: ADAPTOR_STATE = ADAPTOR_STATE.UnInitialized;

    protected register(){
        _adaptorInUse = this;
    }

    protected unRegister(){
        _adaptorInUse = undefined;
    }

    public get state() {
        return this.internalState;
    }

    public get stateName() {
        return ADAPTOR_STATE[this.internalState];
    }

    public get isConnected() {
        return this.internalState === ADAPTOR_STATE.Connected;
    }

    public constructor() {
        super();
        if (_adaptorInUse) {
            const errStr = `there is already an adapter in use, ${_adaptorInUse.adaptorName()}`;
            printer(errStr);
            throw new AdaptorError(errStr, _adaptorInUse.state);
        }
    }


    public abstract adaptorName(): string;
    public abstract init(): Promise<any>;
    public abstract shutDown(): Promise<any>;

    public transition(target: ADAPTOR_STATE) {
        this.internalState = moveToState(this.internalState, target);
    }

    /* user */
    public abstract userUpsert(
        token: User
    ): Promise<any>;

    public abstract userPropertyUpsert(
        modifications: UserProp[]
    ): Promise<UserProp[]>;

    public abstract userSelectByFilter(p: { tokenUpdatedAfter: string, includeBanned: boolean }): Promise<User[]>;

    /*Tokens*/
    public abstract tokenUpsert(token: Token): Promise<Token>;

    public abstract async tokenPropertyUpsert(
        modifications: TokenProp[]
    ): Promise<TokenProp[]>;

    public abstract tokenAssociateWithUser(
        tokenId: string,
        userId: string
    ): Promise<any>;

    public abstract async revokeToken(
        id: string,
        ipAddr: string,
        revokeReason: string
    ): Promise<any>;

    public abstract tokenGC(deleteOlderThan: string): Promise<number>;

    public abstract tokenSelectAll(includeInValid?: boolean): Promise<Token[]>;

    public abstract async tokenSelectAllByUser(prop: {
        id: string, name: string, email: string
    }): Promise<Token[]>;

    /* templates */
    public abstract templateSelectAll(): Promise<Template[]>;

}

