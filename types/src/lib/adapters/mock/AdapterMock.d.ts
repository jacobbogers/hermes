import { AdapterBase } from '../AdapterBase';
import { Template, Token, TokenProp, User, UserProp } from '../types';
export declare class AdapterMock extends AdapterBase {
    private user;
    private userProp;
    private token;
    private tokenProp;
    private template;
    adaptorName(): string;
    constructor();
    dumpDB(): string;
    shutDown(): Promise<void>;
    init(): Promise<void>;
    userUpsert(user: User): Promise<User | undefined>;
    userPropertyUpsert(modifications: UserProp[]): Promise<UserProp[]>;
    tokenAssociateWithUser(tokenId: string, userId: string): Promise<void>;
    templateSelectAll(): Promise<Template[]>;
    tokenGC(deleteOlderThen: string): Promise<number>;
    tokenUpsert(token: Token): Promise<Token>;
    revokeToken(id: string, ipAddr: string, revokeReason: string): Promise<Token | undefined>;
    tokenSelectAllByUser({id, name, email}: {
        id?: string;
        name?: string;
        email?: string;
    }): Promise<Token[]>;
    tokenPropertyUpsert(modifications: TokenProp[]): Promise<TokenProp[]>;
    tokenSelectAll(includeInValid?: boolean): Promise<Token[]>;
    userSelectByFilter(p: {
        tokenUpdatedAfter: string;
        includeBanned: boolean;
    }): Promise<any>;
    private populateMaps();
}
