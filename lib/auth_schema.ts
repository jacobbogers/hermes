//import * as util from 'util';

/*
let: uid = require('uid-safe');

//types and definitions

export const ipv6RegExp = /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/;
export const ipv4RegExp = /\b((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.|$)){4}\b/;

export type PURPOSE = 'SESSION' | 'RESET-PASSWORD' | 'ACTIVATE-ACCOUNT' | 'INVITATION' | 'SESSION_AUTHORIZED';
export type REVOKE_REASON = 'EXPIRED' | 'NEWER_KEY_USED' | 'NOT_REVOKED' | 'ACTIVATED' | 'INVITATION-CONFIRMED';


export interface IUser {
    id: string;
    name: string;
    email: string;
}

export interface IToken {
    id: string;
    purpose: PURPOSE;
    ipAddress: string;
    timestampIssuance: number;
    timestampRevoked: number;
    timestampExpire: number;
    revokeReason: REVOKE_REASON;

}

export interface ICookie extends IToken {
    cookieTemplate: ICookieTemplate;
}

export interface ICookieTemplate {
    cookieName: string;
    path: string;
    maxAge: number; //ms
    httpOnly: boolean;
    secure: boolean;
    domain: string;
    sameSite: boolean;
    refreshMaxAge: boolean;
}


export class User {
    private usr: IUser;
    private props: Map<string, string>;
    constructor(u: IUser) {
        let id = u.id || uid(24);
        this.usr = Object.assign({}, u, { id });
        this.props = new Map(); //copy
    }
    hasProp(propName: string): boolean {
        return this.props.has(propName);
    }
    setProp(propName: string, propValue: string) {
        this.props.set(propName, propValue);
        return this;
    }
    deleteProp(propName: string): boolean {
        return this.props.delete(propName);
    }
}

export class Token {
    private token: IToken;
    private props: Map<string, string>;
    constructor(t: IToken) {
        let id = t.id || uid(24);
        this.token = Object.assign({}, t, { id });
        this.props = new Map<string, string>();
    }
    hasProp(propName: string): boolean {
        return this.props.has(propName);
    }
    setProp(propName: string, propValue: string) {
        this.props.set(propName, propValue);
        return this;
    }
    deleteProp(propName: string): boolean {
        return this.props.delete(propName);
    }
    get isCookie(): boolean {
        return (this.token as ICookie).cookieTemplate !== undefined;
    }
    get template(): ICookieTemplate {
        return (this.token as ICookie).cookieTemplate;
    }
}

//currentTime function must be global, use Symbol

const currentTime = (): number => {
    return Date.now();
};
/*
export class User {
    public static createUser(u: IUser) {
        return new User(u.id, u.name, u.email);
    }
    private _self: IUser;
    private userProps: Map<string, UserProp>;
    private issuedKeys: Map<string, IssuedKey>;

    constructor(id: string, name: string, email: string) {
        this._self = { id, name, email };
    }
    public get self() {
        return this._self;
    }
    public addProperty(up: UserProp): UserProp {
        this.userProps.set(up.name, up);
        return up;
    }
    public addKey(ik: IssuedKey): IssuedKey {
        this.issuedKeys.set(ik.self.sessionKey, ik);
        return ik;
    }

    public getKeys(filter: PURPOSE[]): Map<string, IssuedKey> {
        let rc = new Map<string, IssuedKey>();
        let arr = Array.from(this.issuedKeys.entries());

        for (let [key, info] of arr) {
            if (filter.indexOf(info.purpose) >= 0) {
                rc.set(key, info);
            }
        }
        return rc;
    }
    public getToBeExpired(): Map<string, IssuedKey> {
        let rc = new Map<string, IssuedKey>();
        let arr = Array.from(this.issuedKeys.entries());
        for (let [, info] of arr) {
            if (info.timeToDeath <= 0 && info.revoked === 0) {
                rc.set(info.key, info);
            }
        }
        return rc;
    }
    public expireKeys(): Map<string, IssuedKey> {
        let map = this.getToBeExpired();
        if (map.size === 0) {
            return map;
        }
        let rc = new Map<string, IssuedKey>();
        map.forEach((value, key) => {
            rc.set(key, value.revoke(currentTime(), 'EXPIRED')); //chanche the map while iterating it?
        });
        return rc;
    }


}
*/

/*
create table user_props (
   fk_user bigint,
   name varchar(30),
   value varchar(60),
   constraint user_props_user_fk FOREIGN KEY (fk_user) REFERENCES auth.user(id)
)*/
/*
export interface IUserProp {
    name: string;
    value: string;
    user: User;
}

export function isIUserProp(o: Partial<IUserProp>): boolean {
    if (o && (
        o.name && typeof o.name === 'string'
        &&
        o.value && typeof o.value === 'string'
        &&
        o.user && o.user instanceof User

    )) {
        return true;
    }
    return false;
}


export class UserProp {

    public static createProperty(s: IUserProp): UserProp {
        return s.user.addProperty(new UserProp(s.user, s.name, s.value));
    }

    private _self: IUserProp;

    private constructor(user: User, name: string, value: string) {
        this._self = { name, value, user };
    }
    public get name() {
        return this._self.name;
    }
    public get value() {
        return this._self.value;
    }
    public get user() {
        return this._self.user;
    }

    public get self() {
        return this._self;
    }

}


/*
create table issued_keys (
   fk_user bigint,
   session_key UUID,
   purpose varchar(5),   
   ip_addr inet,
   timestamp_issued bigint,  
   timestamp_revoked bigint,     
   timestamp_lifespan bigint,
   CONSTRAINT pk_issued_keys PRIMARY KEY (session_key),
   CONSTRAINT fk_issued_keys_user FOREIGN KEY (fk_user) REFERENCES auth.user(id)
)
*/



/**
 * Note a user can be connected to the backend with multiple tabs, in this case there will be more then on
 * key of puprose 'SESSION' 
 * 
 */
/*
export function isValidIP(ip: string) {
    return ipv6RegExp.test(ip) || ipv4RegExp.test(ip);
}


export interface IIssuedKey {
    sessionKey: string;
    purpose: PURPOSE;
    ipAddr: string;
    timeStampIssuance: number;
    timeStampRevoked: number;
    revokedReason: REVOKED_REASON;
    timeStampLifespan: number;
    port: number;
    owner: User; //link to owner
}

export function isIIssuedKey(o: Partial<IIssuedKey>): boolean {
    if (o && (
        o.sessionKey && typeof o.sessionKey === 'string'
        &&
        o.purpose && typeof o.purpose === 'string'
        &&
        o.ipAddr && typeof o.ipAddr === 'string'
        &&
        o.timeStampIssuance && typeof o.timeStampIssuance === 'number'
        &&
        o.timeStampRevoked && typeof o.timeStampRevoked === 'number'
        &&
        o.timeStampLifespan && typeof o.timeStampLifespan === 'number')
    ) {
        return true;
    }
    return false;
}


export function createEmptyKey(): IIssuedKey {
    return {
        sessionKey: '',
        purpose: 'SESSION',
        ipAddr: '',
        timeStampIssuance: 0,
        timeStampRevoked: 0,
        revokedReason: 'NOT_REVOKED',
        timeStampLifespan: 0,
        port: 0,
        owner: null as any
    };
}

export function createKey(key: Partial<IIssuedKey>) {
    let o: IIssuedKey = createEmptyKey();
    Object.assign(o, key);
    return o;
}

export function copyKeyWithChanges(key: Partial<IIssuedKey>, change: Partial<IIssuedKey>) {
    let s = createKey(key);
    return Object.assign(s, change);
}


export class IssuedKey {

    public static createKey(s: IIssuedKey): IssuedKey {
        return new IssuedKey(
            s.owner,
            s.sessionKey,
            s.purpose,
            s.ipAddr,
            s.port,
            s.timeStampRevoked,
            s.timeStampLifespan,
            s.timeStampIssuance);
    }

    private readonly _self: IIssuedKey;


    constructor(
        owner: User,
        sessionKey: string,
        purpose: PURPOSE,
        ipAddr: string,
        port: number,
        timeStampRevoked: number,
        timeStampLifespan: number = 10 * 1000,
        timeStampIssuance: number = currentTime()) {
        this._self = createKey({
            owner,
            sessionKey,
            purpose,
            ipAddr,
            port,
            timeStampRevoked,
            timeStampLifespan,
            timeStampIssuance
        });
        let validIp = isValidIP(ipAddr);

        if (!isIIssuedKey(this._self) || !validIp) {
            throw new Error(util.format('invalid parameters for IssuedKey:[%j]', this._self));
        }

    }

    get self() {
        return this._self;
    }

    get key() {
        return this._self.sessionKey;
    }

    get user() {
        return this._self.owner;
    }
    get ip() {
        return this._self.ipAddr;
    }
    get issuance() {
        return this._self.timeStampIssuance;
    }
    get revoked() {
        return this._self.timeStampRevoked;
    }
    get lifeSpan() {
        return this._self.timeStampLifespan;
    }
    get timeToDeath() {
        return currentTime() - (this._self.timeStampLifespan + this._self.timeStampIssuance);
    }
    get ipSignature() {
        return this._self.ipAddr + '@' + this._self.port;
    }
    revoke(ts: number, revokedReason: REVOKED_REASON): IssuedKey {
        let ns = copyKeyWithChanges(this.self, { timeStampRevoked: ts, revokedReason });
        return ns.owner.addKey(IssuedKey.createKey(ns));
    }
    get purpose() {
        return this._self.purpose;
    }

}

*/
