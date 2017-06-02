
'use strict';

import { Store } from 'express-session';

import { SystemInfo } from './system';

//import * as express from 'express';
import {
    //general
    AdaptorBase,
    PropertiesModifyMessage,
    AdaptorError,
    AdaptorWarning,
    //tokens
    TokenMessage,
    TokenMessageReturned,
    TokenPropertiesModifyMessageReturned,
    TokensAndPropsMessage,
    //user
    UsersAndPropsMessage,
    UserMessageReturned,
    UserMessageBase,
    UserPropertiesModifyMessageReturned,
    //template
    TemplatePropsMessage,



} from './db_adaptor_base';

import { logger } from './logger';

import {

    MapWithIndexes,
    staticCast,
    AnyObjProps,
    deepClone

} from './utils';

import * as util from 'util';
util;

import express = require('express');

const STKN = 'STKN';
const USR_ANONYMOUS = 'anonymous';
const TEMPLATE_DEFAULT_COOKIE = 'default_cookie';
const LOGIN_PASSWORD_PROPERTY = 'password';
const BLACKLISTED = 'BLACKLISTED';

export interface SessionHash {
    [sid: string]: Express.SessionData;
}

export interface UserProperties {
    name?: string;
    email?: string;
    id?: number;
    userProps: {
        [name: string]: string;
    };
}

export interface TokenProperties extends TokenMessage {
    sessionProps: {
        [name: string]: string;
    };
}

export interface UserPropertyProperties {
    fkUserId: number;
    name: string;
    value: string;
}

export interface TemplateProperties extends TemplatePropsMessage {

}

export enum AdaptorInstructionSet {
    NOP = 0,
    TOKEN_CHANGE = 1,

}


export class HermesStoreError extends Error {

    private _connected: boolean;

    constructor(message: string, connected: boolean) {
        super(message);
        this.message = message;
        this.name = 'HermesStoreError';
        this._connected = connected;
    }

    public toString() {
        return `HermesStoreError: state:${this._connected ? '' : 'NOT'} connected  `;
    }
}

//TODO move ot its own module
export class AuthenticationError {

    private context: string;
    private message: string;

    constructor(context: string, message: string) {
        this.context = context;
        this.message = message;
    }

    toString() {
        return util.format('%s, %s', this.context || '', this.message);
    }
    value() {
        return [this.context, this.message];
    }
}


/**
 * how to use this store;
 * create first and connect to express-session object
 * the express-session object default sets the internal  "storeReady" to true, on creation, make sure this is turned off
 *  
 */

export interface HermesStoreProperties {

    adaptor: AdaptorBase; // assign to with subclass of new AdaptorBase(...)  
    defaultCookieOptionsName?: string;
}


export type CallBack<T> = (err: any, obj: T) => void;

const defer = typeof setImmediate === 'function' ? setImmediate : (fn: Function, ...rest: any[]) => { process.nextTick(fn.bind.call(fn, rest)); };

export class HermesStore extends Store {

    private adaptor: AdaptorBase;
    //userMaps
    private userMaps: MapWithIndexes<UserProperties>;
    private tokenMaps: MapWithIndexes<TokenProperties>;
    private templateMaps: MapWithIndexes<TemplateProperties>;
    private defaultTemplate: string;


    constructor(options: HermesStoreProperties) {
        super(options);
        // the express-session object default sets the internal  "storeReady" to true, on creation, make sure this is turned off.
        // this will ensure that the store will disable the middleware by default.
        this.adaptor = options.adaptor;
        this.defaultTemplate = options.defaultCookieOptionsName || TEMPLATE_DEFAULT_COOKIE;


        let _si = SystemInfo.createSystemInfo();

        this.userMaps = new MapWithIndexes<UserProperties>('id', 'email', 'name');
        this.tokenMaps = new MapWithIndexes<TokenProperties>('tokenId');
        this.templateMaps = new MapWithIndexes<TemplateProperties>('templateName', 'id');


        this.once('newListener', (event: string, listener: () => void) => {
            if (event === 'disconnect') {
                if (!this.adaptor.connected) {
                    listener();
                }
            }
        });
        //TODO, fire off initialisation of adaptor,
        this.adaptor.init().then((ok) => {
            logger.info('DBAdaptor instance created successfully.[%s]', ok ? 'true' : 'false');
            logger.info('loading templates...');
            return this.adaptor.templateSelectAll();
        }).then((templates) => {
            this.processTemplates(templates);
            this.getDefaultCookieOptions(); // will throw if not exist
            logger.info('loading tokens...');
            return this.adaptor.tokenSelectAllByFilter(null, 0, 0);
        }).then((tokens) => {
            this.processTokenSelectAll(tokens);
            logger.info('loading users....');
            return this.adaptor.userSelectByFilter();
        }).then((users) => {
            this.processUsersSelectAll(users);
            let anonymous = this.userMaps.get('name', USR_ANONYMOUS);
            if (!anonymous) {
                let err = new HermesStoreError(`User ${USR_ANONYMOUS} doesnt exist`, this.connected);
                _si.addError(err);
                throw err;
            }
            // make user anonymous readonly
            this.userMaps.set(anonymous, true);
            logger.info('...all db data cached');
            this.emit('connect');
        }).catch((err) => {
            logger.error('failed because of %j', err);
            let errors = _si.systemErrors(null, Error /*AdaptorError*/);
            AdaptorError;

            logger.error('All adaptor errors #(%d) from the adaptor: %j', errors.length, errors.length ? errors.map((err) => String(err)) : 'NO ERRORS');

            let warnings = _si.systemWarnings(null, AdaptorWarning);
            logger.warn('All warnings #(%d) from the adaptor %j', warnings.length, warnings.length ? warnings : 'NO WARNINGS');

            this.adaptor.emit('disconnect');
        });

        //wire it up
        this.adaptor.once('connect', () => {
            //
            this.emit('connect');
        });

        this.adaptor.once('disconnect', () => {
            this.emit('disconnect');
        });

        if (this.adaptor.connected) {
            this.adaptor.emit('connect');
        }
    }

    private processTemplates(data: TemplatePropsMessage[]) {

        for (let tt of data) {
            let tp: TemplateProperties = {
                id: tt.id,
                cookieName: tt.cookieName,
                path: tt.path,
                maxAge: tt.maxAge,
                httpOnly: tt.httpOnly,
                secure: tt.secure,
                domain: tt.domain,
                sameSite: tt.sameSite,
                rolling: tt.rolling,
                templateName: tt.templateName
            };
            this.templateMaps.set(tp, true);
        }
    }

    private processTokenSelectAll(data: TokensAndPropsMessage[]) {

        for (let token of data) {
            //fetch user data
            let uf: UserProperties | undefined = this.userMaps.get('id', token.fkUserId);

            if (!uf) {
                uf = { name: token.usrName, email: token.usrEmail, id: token.fkUserId, userProps: {} };
                this.userMaps.set(uf);
            }

            if (token.propName) {
                uf.userProps[token.propName] = token.propValue;
            }

            //fetch token data
            let tf: TokenProperties | undefined = this.tokenMaps.get('tokenId', token.tokenId);
            if (!tf) {
                tf = {
                    tokenId: token.tokenId,
                    fkUserId: token.fkUserId,
                    purpose: token.purpose,
                    ipAddr: token.ipAddr,
                    tsIssuance: token.tsIssuance,
                    tsRevoked: token.tsRevoked,
                    tsExpire: token.tsExpire,
                    revokeReason: token.revokeReason,
                    templateName: token.templateName,
                    sessionProps: {
                    }
                };
                this.tokenMaps.set(tf);
            }
            if (token.sessionPropName && ['id', 'cookie', '_hermes', '_user'].indexOf(token.sessionPropName) === -1) {
                tf.sessionProps[token.sessionPropName] = token.sessionPropValue;
                this.tokenMaps.set(tf);
            }
        }
    }



    private processUsersSelectAll(data: UsersAndPropsMessage[]) {
        this.userMaps.clear();
        for (let user of data) {
            let uf = this.userMaps.get('id', user.userId);
            if (!uf) {
                uf = {
                    name: user.userName,
                    email: user.userEmail,
                    id: user.userId,
                    userProps: {}
                } as UserProperties;
                this.userMaps.set(uf);
            }
            if (user.propName && uf) {
                uf.userProps[user.propName] = user.propValue;
                this.userMaps.set(uf);
            }
        }
    }


    private tokenPropertiesUpdateInsert(token: TokenProperties): Promise<TokenPropertiesModifyMessageReturned[]> {

        let oldToken = this.tokenMaps.get('tokenId', token.tokenId);
        let oldSessProps = (oldToken && oldToken.sessionProps) || {}; //empty
        let newSessProps = token.sessionProps || {};
        let actions: PropertiesModifyMessage[] = [];
        //what to add/modify
        logger.debug('%s has %d nr of sessions props to process.', token.tokenId, Object.keys(token.sessionProps).length);
        for (let props in newSessProps) {
            if (oldSessProps[props] !== newSessProps[props]) {
                logger.debug('%s: property %s has changed', token.tokenId, props);
                actions.push({
                    propName: props,
                    propValue: newSessProps[props],
                    invisible: false
                });
            }
        }

        let listOfNewProps = Object.keys(newSessProps);

        let deletes = Object.keys(oldSessProps).filter((propName) => {
            return listOfNewProps.indexOf(propName) === -1;
        }).map((propNameFiltered) => {
            logger.trace('%s: property %s marked for deletion', token.tokenId, propNameFiltered);

            let rc: PropertiesModifyMessage = { propName: propNameFiltered, propValue: oldSessProps[propNameFiltered], invisible: true };
            return rc;
        }) as PropertiesModifyMessage[];

        actions.push.apply(actions, deletes);
        logger.debug('%s will process %d nr of properties on data-base', token.tokenId, actions.length);
        if (actions.length > 0) {//nothing to do 
            return this.adaptor.tokenInsertModifyProperty(token.tokenId, actions);
        }
        return Promise.resolve([] as TokenPropertiesModifyMessageReturned[]);

    }

    private tokenUpdateInsert(token: TokenProperties): Promise<TokenMessageReturned> {

        let oldToken = this.tokenMaps.get('tokenId', token.tokenId) || {} as TokenProperties;
        //console.log('token in store:', oldToken);
        //console.log('token new:', token);
        let changed = false;
        let propName: keyof TokenProperties;
        for (propName in token) {
            if (['tokenId', 'sessionProps'].indexOf(propName) >= 0) {
                continue;
            }
            if (oldToken[propName] !== token[propName]) {
                logger.debug('%s, propname %s has changed old:%j  new:%j', token.tokenId, propName, oldToken[propName], token[propName]);
                changed = true;
            }
        }
        let msg: TokenMessage = {
            tokenId: token.tokenId,
            fkUserId: token.fkUserId,
            purpose: STKN,
            ipAddr: token.ipAddr,
            tsIssuance: token.tsIssuance,
            tsRevoked: null,
            revokeReason: null,
            tsExpire: token.tsExpire,
            templateName: token.templateName
        };
        if (changed) {
            logger.info('%s, token attributes have changed', msg.tokenId);
            return this.adaptor.tokenInsertModify(msg);
        }
        logger.trace('token has not changed');

        //convert TokenMessage to TokenMessageReturned
        let template = this.templateMaps.get('templateName', token.templateName || '');
        let templateId = (template && template.id) || null;
        let tokenMsgReply = Object.assign({}, msg, { templateId: templateId }) as TokenMessageReturned;

        delete staticCast<TokenMessage>(tokenMsgReply).templateName;
        return Promise.resolve(tokenMsgReply);
    }

    private mapTokenToSession(token: TokenProperties): Express.SessionData {

        let template = this.templateMaps.get('templateName', token.templateName || TEMPLATE_DEFAULT_COOKIE);
        if (template === undefined) {
            let errStr = util.format('No cookie template found with name: %s', token.templateName || TEMPLATE_DEFAULT_COOKIE);
            logger.error(errStr);
            throw new Error(errStr);
        }


        let sess: Express.SessionData = {
            id: token.tokenId,
            _hermes: Object.freeze({

                tokenId: token.tokenId,
                fkUserId: token.fkUserId,
                purpose: token.purpose,
                ipAddr: token.ipAddr,
                tsIssuance: token.tsIssuance,
                tsRevoked: token.tsRevoked,
                tsExpire: token.tsExpire,
                revokeReason: token.revokeReason,
                templateName: token.templateName

            }) as TokenProperties,
            cookie: Object.seal({
                maxAge: template.maxAge,
                originalMaxAge: template.maxAge,
                expires: new Date(token.tsExpire),
                domain: template.domain,
                secure: template.secure,
                httpOnly: template.httpOnly,
                path: template.path
            }),
            _user: Object.seal(this.userMaps.get('id', token.fkUserId || USR_ANONYMOUS) || this.userMaps.get('id', USR_ANONYMOUS))

        };
        for (let propName in token.sessionProps) {
            sess[propName] = token.sessionProps[propName];
        }
        logger.trace('mapTokenTOSession: %j', sess);
        return sess;
    }

    private stripSessionProps(sess: Express.Session | Express.SessionData): AnyObjProps {
        let collector: AnyObjProps = {};

        for (let propName in sess) {
            if (['id', 'req', '_hermes', '_user', 'cookie'].indexOf(propName) >= 0) {
                continue;
            }
            let value = sess[propName];

            switch (typeof sess[propName]) {
                case 'string':
                    break;
                case 'number':
                    value = '' + value;
                    break;
                case 'object':
                    if (value === null) { //yes, null gives 'object' too
                        break;
                    }
                    value = JSON.stringify(value);
                    break;
                default:
                    value = undefined;

            }

            if (value === undefined) {
                continue;
            }

            collector[propName] = value;
        }
        return collector;
    }

    private mapSessionToUser(sess: Express.Session | Express.SessionData): UserProperties {

        let user = sess['_user'] as UserProperties;

        if (user === undefined) {// no user information, set it to anonymous
            return staticCast<UserProperties>(this.userMaps.get('name', USR_ANONYMOUS));
        }
        //
        let rc: UserProperties = {
            name: user.name,
            email: user.email,
            id: user.id,
            userProps: deepClone(user.userProps || {})
        };
        //collect props 
        for (let propName in user.userProps) {
            let value = user.userProps[propName];
            switch (typeof value) { // need to check can be modified by module consumer.
                case 'string':
                    break;
                case 'number':
                    value = '' + value;
                    break;
                case 'object'://null value will get you here
                    if (value !== null) {
                        value = JSON.stringify(value);
                    }
                    break;
                default:
                    value = undefined as any;
            }
            if (value === undefined) {
                continue;
            }
            rc.userProps[propName] = value;
        }
        return rc;
    }

    private mapSessionToToken(sess: Express.Session | Express.SessionData): TokenProperties {

        // what we need is set the expire datum 
        // TODO: re populate the session_properties and user properties map
        let _hermes = sess['_hermes'] || {};

        // correct for missing user, set to anonymous
        if (!_hermes || !_hermes.fkUserId) {// not set? (should never happen) map to "anonymous"
            let anoUser = this.userMaps.get('name', USR_ANONYMOUS);
            if (!anoUser) {
                throw new Error('anonymous user not found in cache');
            }
            _hermes.fkUserId = anoUser.id;
        }

        let token = {
            tokenId: sess['id'],
            fkUserId: _hermes && _hermes['fkUserId'],
            purpose: STKN,
            ipAddr: (sess.req && sess.req.ip) || _hermes['ipAddr'],
            tsIssuance: (_hermes && _hermes['tsIssuance']) || Date.now(),
            tsRevoked: (_hermes && _hermes['tsRevoked']) || null,
            tsExpire: sess.cookie.expires.valueOf() as number,
            revokeReason: (_hermes && _hermes['revokeReason']) || null,
            templateName: (_hermes && _hermes['templateName']) || this.defaultTemplate,
            sessionProps: this.stripSessionProps(sess)
        } as TokenProperties;

        logger.debug('expiration-Issuance: %d', (token.tsExpire - token.tsIssuance) / 3600);
        logger.trace('mapSessionToToken: %j', token);
        return token;
    }

    private getSession(sessionId: string): Express.SessionData | undefined {

        let token = this.tokenMaps.get('tokenId', sessionId);

        if (token === undefined) {
            return;
        }

        /* not solved in the store
        if (token.revokeReason) {
            logger.debug('token "%s" was revoked:', sessionId);
            return;
        }*/

        if (token.tsExpire <= new Date().getTime()) {
            logger.debug('token "%s" expired ,token %j', sessionId, token);
            return;
        }

        if (token.purpose !== STKN) {
            logger.error('INTERNAL INCONSISTANCY: token "%s" is NOT a cookie but appears in a cookie header', sessionId);
            return;
        }
        return this.mapTokenToSession(token);
    }

    /* users */
    /* users */
    /* users */

    protected userPropertiesUpdateInsert(user: UserProperties): Promise<UserPropertiesModifyMessageReturned[]> {

        let oldUser = this.userMaps.get('id', user.id);
        let oldProps = (oldUser && oldUser.userProps) || {}; //empty
        let newProps = user.userProps || {};
        let actions: PropertiesModifyMessage[] = [];

        if (user.name === USR_ANONYMOUS) {
            return Promise.resolve([] as UserPropertiesModifyMessageReturned[]);
        }

        //what to add/modify
        for (let props in newProps) {
            if (oldProps[props] !== newProps[props]) {
                logger.trace('User %s, property userProp[\%s\'] has changed', user.email, props);
                actions.push({
                    propName: props,
                    propValue: newProps[props],
                    invisible: false
                });
            }
        }

        let listOfNewProps = Object.keys(newProps);

        let deletes = Object.keys(oldProps).filter((propName) => {
            return listOfNewProps.indexOf(propName) === -1;
        }).map((propNameFiltered) => {
            logger.trace('User:%s, property %s marked for deletion', user.name, propNameFiltered, user.name);
            let rc: PropertiesModifyMessage = { propName: propNameFiltered, propValue: oldProps[propNameFiltered], invisible: true };
            return rc;
        }) as PropertiesModifyMessage[];

        actions.push.apply(actions, deletes);

        if (actions.length > 0) {//nothing to do 
            return this.adaptor.userInsertModifyProperty(staticCast<number>(user.id), actions);
        }
        return Promise.resolve([] as UserPropertiesModifyMessageReturned[]);

    }



    private userInsert(user: UserProperties): Promise<UserMessageReturned> {



        let userAnon = staticCast<UserProperties>(this.userMaps.get('name', USR_ANONYMOUS));
        let rcAnon: UserMessageReturned = {
            userName: staticCast<string>(userAnon.name),
            userEmail: staticCast<string>(userAnon.email),
            userId: staticCast<number>(userAnon.id)
        };

        if (user.id === userAnon.id || user.name === userAnon.name) {
            return Promise.resolve(rcAnon);
        }

        if (user.id === undefined && user.name === undefined) {
            return Promise.resolve(rcAnon);
        }
        // at this point its not an anonymous user, we could have partial information , make the best of it      
        let oldUser = this.userMaps.get('id', user.id);
        if (!oldUser) {
            oldUser = this.userMaps.get('name', user.name);
            if (!oldUser) {
                oldUser = this.userMaps.get('email', user.email);
            }
        }

        if (oldUser) { //correct possible mess and resolve
            user.id = oldUser.id;
            user.name = oldUser.name;
            user.email = oldUser.email;
            let reply: UserMessageReturned = {
                userName: staticCast<string>(user.name),
                userEmail: staticCast<string>(user.email),
                userId: staticCast<number>(user.id)
            };
            return Promise.resolve(reply);
        }

        let msg: UserMessageBase = {
            userName: staticCast<string>(user.name),
            userEmail: staticCast<string>(user.email),
        };
        logger.trace('Will insert user %j', msg);
        return this.adaptor.userInsert(msg);
    }






    /* specific tooling */
    /* specific tooling */
    /* specific tooling */

    //TODO move to authentication middleware
    public mustAuthenticate(sess?: Express.Session): boolean {
        if (!sess) {
            return true;
        }

        if (this.isAnonymous(sess)) {
            return true;
        }

        if (this.isUserBlackListed(sess)) {
            return true;
        }

        if (this.hasSessionExpired(sess)) {
            return true;
        }
        return false;

    }

    public hasSessionExpired(sess?: Express.Session): boolean {
       
        let expires = this.getExpiredAsNumber(sess);

        if (!expires || expires < Date.now()) {
            return true;
        }
        return false;
    }

    public isAnonymous(sess?: Express.Session): boolean {

        if (!sess) {
            return false;
        }

        let anonUser = staticCast<UserProperties>(this.getUserByName(USR_ANONYMOUS));
        let sessUser = sess['_user'] as UserProperties;

        if (sessUser.name === anonUser.name) {
            return true;
        }

        if (!sessUser) {
            return true;
        }
        return false;
    }

    public isUserBlackListed(sess?: Express.Session): boolean {
        if (!sess) {
            return false;
        }
        let sessUser = sess['_user'] as UserProperties;
        if (sessUser && sessUser.userProps && sessUser.userProps['BLACKLISTED']) {
            return true;
        }
        return false;


    }

    public getExpiredAsNumber(sess?: Express.Session): number | undefined {
        let rc: number;
        if (!sess){
            return undefined;
        }
        switch (true) {
            case typeof sess.cookie.expires === 'number':
                rc = (sess.cookie.expires as any);
                break;
            case sess.cookie.expires instanceof Date:
                rc = (sess.cookie.expires as Date).getTime();
                break;
            default: // last ditch attempt
                rc = new Date(sess.cookie.expires as any).getTime();
        }
        return Number.isNaN(rc) ? undefined : rc;
    }

    public getUserById(userId: number): UserProperties | undefined {
        return this.userMaps.get('id', userId);
    }

    public getUserByName(userName: string): UserProperties | undefined {
        return this.userMaps.get('name', userName);
    }

    public getUserByEmail(email: string): UserProperties | undefined {
        return this.userMaps.get('email', email);
    }

    //TODO move to authentication middleware
    public authenticate(sess: Express.Session, email: string, password: string): AuthenticationError[] | undefined {

        //check if already authenticated

        if (this.mustAuthenticate(sess) === false) { // cant continue 
            return [new AuthenticationError('user-logged-in', 'User must log out first')];
        }

        //potential User
        let pUser = this.getUserByEmail(email);
        if (!pUser) {
            return [new AuthenticationError('email-not-exist', 'The Email and password combination are Unknown')];
        }

        if (pUser.userProps[BLACKLISTED]) {
            sess['_user'] = pUser; // valid user but blacklisted
            return [new AuthenticationError('email-black-listed', 'User is blacklisted')];
        }
        //password is the same (case sensitive compare)
        let passw = pUser.userProps[LOGIN_PASSWORD_PROPERTY] || '';
        if (passw.trim() !== password.trim()) {
            return [new AuthenticationError('invalid-login', 'The Email and password combination are Unknown')];
        }
        //password is correct so..
        sess['_user'] = pUser;
        return;
    }

    public get connected() {
        return this.adaptor.connected;
    }

    public getCookieOptions(templateName: string): express.CookieOptions {
        if (!this.connected) {
            throw new Error('The Store is not "connected" and in a usable state');
        }
        let opt = this.templateMaps.get('templateName', templateName);
        if (opt === undefined) {
            let err = util.format('No Cookie template found for name: "%s"', templateName);
            logger.error(err);
            throw new Error(err);
        }
        let rc: express.CookieOptions = {
            maxAge: opt.maxAge,
            //signed: true,
            //expires:
            httpOnly: opt.httpOnly,
            path: opt.path,
            domain: opt.domain,
            secure: opt.secure,
            //encode
            sameSite: opt.sameSite
        };
        return rc;
    }

    public getDefaultCookieOptions() {
        return this.getCookieOptions(this.defaultTemplate || 'default_cookie');
    }


    /* interface methods of Store */
    /* interface methods of Store */
    /* interface methods of Store */

    /**
     * Get all active sessions.
     *
     * @param {function} callback
     * @public
     */

    public all(callback: CallBack<SessionHash>) {

        let allSessions = this.tokenMaps.values().filter((token) => {
            return token.purpose === STKN;
        }).map((token) => {
            let rc = staticCast<Express.SessionData>(this.getSession(token.tokenId));
            return rc;
        });
        //we have all sessions as an array
        let rc = allSessions.reduce((hash, sess) => {
            let key = sess['id'] as string;
            hash[key] = sess;
            return hash;
        }, {} as SessionHash);
        callback && defer(callback, null, rc);
    }

    /**
    * Clear all sessions.
    *
    * @param {function} callback
    * @public
    */

    public clear(callback: CallBack<void>) {
        this.tokenMaps.clear();
        this.userMaps.clear();
        this.templateMaps.clear();
        callback && defer(callback);
    }

    /**
     * Destroy the session associated with the given session ID.
     *
     * @param {string} sessionId
     * @param {CallBack} callBack
     * @public
     */

    public destroy(sessionId: string, callback: CallBack<void>) {
        logger.debug('destroy session:%s', sessionId);
        // ge the token
        let token = this.tokenMaps.get('tokenId', sessionId);
        if (token) {
            this.tokenMaps.remove(token);
        }
        callback && defer(callback);
    }

    /**
     * Commit the given session associated with the given sessionId to the store.
     *
     * @param {string} sessionId
     * @param {object} session
     * @param {function} callback
     * @public
     */

    public get(sessionId: string, callback: CallBack<Express.SessionData>) {
        logger.debug('get session by sessionId: %s', sessionId);
        defer(callback, null, this.getSession(sessionId));
    }


    /**
     * Commit the given session associated with the given sessionId to the store.
     *
     * @param {string} sessionId
     * @param {object} session
     * @param {function} callback
     * @public
     * 
     */
    public set(sessionId: string, session: Express.Session, callback: CallBack<Express.Session>) {

        logger.debug('set session by sessionId: %s', sessionId);

        //token
        let token = this.mapSessionToToken(session); // actual goes here
        let oldToken = this.tokenMaps.get('tokenId', token.tokenId) || { sessionProps: {} };
        let updatedToken: TokenProperties;
        //user
        let user = this.mapSessionToUser(session);

        let updatedUser: UserProperties;
        //
        this.userInsert(user).then((reply) => {
            logger.trace('%s: User %s tentative association.', sessionId, reply.userName);
            let oldUser = this.userMaps.get('id', reply.userId) || { userProps: {} };
            updatedUser = {
                name: reply.userName,
                email: reply.userEmail,
                id: reply.userId,
                userProps: deepClone(oldUser.userProps)
            };
            this.userMaps.set(updatedUser);
            return this.userPropertiesUpdateInsert(user);
        }).then((reply) => {
            logger.debug('%s: User %s exist/created, has %d properties', sessionId, updatedUser.name, Object.keys(updatedUser.userProps).length);
            let userProps = updatedUser.userProps;
            for (let msg of reply) {
                if (msg.invisible === true) {
                    delete userProps[msg.propName];
                    continue;
                }
                userProps[msg.propName] = msg.propValue;
            }
            this.userMaps.set(updatedUser);
            token.fkUserId = staticCast<number>(updatedUser.id); // associate
            return this.tokenUpdateInsert(token);
        }).then((reply) => {
            logger.debug('%s: token updated', sessionId);
            //
            //convert from template_id to template_name
            let template = this.templateMaps.get('id', reply.templateId || -1);
            delete reply.templateId;
            Object.assign(token, reply); //update token with returned values

            updatedToken = Object.assign({}, reply, {
                templateName: template && template.templateName,
                sessionProps: oldToken.sessionProps
            }) as TokenProperties;
            //partially update the token in cache to reflect database change

            this.tokenMaps.set(updatedToken);
            return this.tokenPropertiesUpdateInsert(token);
        }).then((replyTokenPropertyMessages) => {

            logger.debug('sessionProps of  token  updated for %s', sessionId);
            let sessionProps = updatedToken.sessionProps;
            for (let msg of replyTokenPropertyMessages) {
                if (msg.invisible === true) {
                    delete sessionProps[msg.propName];
                    continue;
                }
                sessionProps[msg.propName] = msg.propValue;
            }
            this.tokenMaps.set(updatedToken);
            //process change in user properties and user name
            return Promise.resolve('DONE');
        }).then(() => {
            logger.debug('finalize session %s', token.tokenId);
            if (!session._hermes || !session._user) {
                logger.trace('monkey patching session %s', token.tokenId);
                let sess = this.mapTokenToSession(updatedToken);
                logger.info('%s, session should look like this: %j', token.tokenId, sess);
                session._hermes = session._hermes || sess._hermes;
                session._user = session._user || sess._user;
            }
            callback && defer(callback);
        }).catch((err) => {
            logger.error('there was an error: %j', err);
            callback && defer(callback, err);
        });
    }


    /**
 * Touch the given session object associated with the given session ID.
 *
 * @param {string} sessionId
 * @param {object} session
 * @param {function} callback
 * @public
 */

    public touch(sessionId: string, session: Express.Session, callback: CallBack<void>) {
        logger.debug('touch session by sessionId: %s, session:%j', sessionId, session);
        let storedSession = this.getSession(sessionId); //possibly expires the session and returns null
        if (storedSession) {
            // update expiration
            storedSession.cookie = session.cookie;

            let token = this.mapSessionToToken(storedSession);

            this.tokenUpdateInsert(token).then((replyTokenMessage) => {
                // for now we glue sessionProps to this. , normally there is an update sequence here
                Object.assign(token, replyTokenMessage); //update token with returned values
                let template = this.templateMaps.get('id', replyTokenMessage.templateId || -1);
                delete replyTokenMessage.templateId;
                let returnedToken = Object.assign({}, replyTokenMessage, { templateName: template && template.templateName, sessionProps: token.sessionProps }) as TokenProperties;
                this.tokenMaps.set(returnedToken);
                if (!session._hermes || !session._user) {
                    let sess = this.mapTokenToSession(returnedToken);
                    session._hermes = session._hermes || sess._hermes;
                    session._user = session._user || sess._user;
                }
                callback && defer(callback);
            }).catch((err) => {
                logger.error('there was an error: %j', err);
                callback && defer(callback, err);
            });
            return;
        }
        callback && defer(callback);
    }


    /**
     * Get number of active sessions.
     *
     * @param {function} callback
     * @public
     */

    public length(callback: CallBack<number>): void {
        let length = this.tokenMaps.length;
        logger.debug('"length" function called', length);
        callback(null, length);
    }

}
