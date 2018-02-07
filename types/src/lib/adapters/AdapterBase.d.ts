/// <reference types="node" />
import { EventEmitter } from 'events';
import { Template, Token, TokenProp, User, UserProp } from '../adapters/types';
import { ADAPTER_STATE } from './state';
export declare abstract class AdapterBase extends EventEmitter {
    private internalState;
    protected setState(newState: ADAPTER_STATE): void;
    readonly state: ADAPTER_STATE;
    readonly stateName: string;
    readonly isConnected: boolean;
    readonly inError: boolean;
    constructor();
    abstract adaptorName(): string;
    abstract init(): Promise<any>;
    abstract shutDown(): Promise<any>;
    abstract userUpsert(token: User): Promise<any>;
    abstract userPropertyUpsert(modifications: UserProp[]): Promise<UserProp[]>;
    abstract userSelectByFilter(p: {
        tokenUpdatedAfter: string;
        includeBanned: boolean;
    }): Promise<User[]>;
    abstract tokenUpsert(token: Token): Promise<Token>;
    abstract tokenPropertyUpsert(modifications: TokenProp[]): Promise<TokenProp[]>;
    abstract tokenAssociateWithUser(tokenId: string, userId: string): Promise<any>;
    abstract revokeToken(id: string, ipAddr: string, revokeReason: string): Promise<any>;
    abstract tokenGC(deleteOlderThan: string): Promise<number>;
    abstract tokenSelectAll(includeInValid?: boolean): Promise<Token[]>;
    abstract tokenSelectAllByUser(prop: {
        id: string;
        name: string;
        email: string;
    }): Promise<Token[]>;
    abstract templateSelectAll(): Promise<Template[]>;
}
