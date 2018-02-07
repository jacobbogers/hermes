import { EventEmitter } from 'events';
import { includes } from 'lodash';

import { Template, Token, TokenProp, User, UserProp } from '../adapters/types';
import { ADAPTER_STATE } from './state';


export abstract class AdapterBase extends EventEmitter {

    private internalState: ADAPTER_STATE = ADAPTER_STATE.UnInitialized;

    protected setState(newState: ADAPTER_STATE) {
        this.internalState = newState;
    }

    public get state() {
        return this.internalState;
    }

    public get stateName() {
        return ADAPTER_STATE[this.internalState];
    }

    public get isConnected() {
        return this.internalState === ADAPTER_STATE.Connected;
    }

    public get inError() {

        return includes([
            ADAPTER_STATE.ERR_Connecting,
            ADAPTER_STATE.ERR_Initializing
        ], this.internalState);
    }



    public constructor() {
        super();
    }
    
    public abstract adaptorName(): string;
    public abstract init(): Promise<any>;
    public abstract shutDown(): Promise<any>;

    /* user */
    public abstract userUpsert(
        token: User
    ): Promise<any>;

    public abstract userPropertyUpsert(
        modifications: UserProp[]
    ): Promise<UserProp[]>;

    public abstract userSelectByFilter(
        p: { tokenUpdatedAfter: string, includeBanned: boolean }): Promise<User[]>;

    /*Tokens*/
    public abstract tokenUpsert(token: Token): Promise<Token>;

    public abstract async tokenPropertyUpsert(
        modifications: TokenProp[]
    ): Promise<(TokenProp | undefined)[]>;

    public abstract tokenAssociateWithUser(
        tokenId: string,
        userId: string
    ): Promise<any>;

    public abstract async revokeToken(
        id: string,
        ipAddr: string,
        revokeReason: string
    ): Promise<any>;

    public abstract async tokenSelectById(id: string): Promise<Token|undefined>;

    public abstract tokenGC(deleteOlderThan: string): Promise<number>;

    public abstract tokenSelectAll(includeInValid?: boolean): Promise<Token[]>;

    public abstract async tokenSelectAllByUser(prop: {
        id: string, name: string, email: string
    }): Promise<Token[]>;

    /* templates */
    public abstract templateSelectAll(): Promise<Template[]>;

}

