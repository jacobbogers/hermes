
'use strict';


import { Store } from 'express-session';

import { SystemInfo } from './system';

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

import Logger from './logger';

const logger = Logger.getLogger();


import {

    MapWithIndexes,
    AnyObjProps,
    deepClone

} from './utils';

import * as util from 'util';
import express = require('express');

const STKN = 'STKN';
export const USR_ANONYMOUS = 'anonymous';
const TEMPLATE_DEFAULT_COOKIE = 'default_cookie';

export interface SessionHash {
    [sid: string]: Express.SessionData;
}
/*
export interface User {
    name: string;
    email: string;
    id: number;
}*/

export interface UserProperties extends UserMessageReturned {
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

        this.userMaps = new MapWithIndexes<UserProperties>('userId', 'userEmail', 'userName');
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
            let anonymous = this.userMaps.get('userName', USR_ANONYMOUS);
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
            let uf: UserProperties | undefined = this.userMaps.get('userId', token.fkUserId);

            if (!uf) {
                uf = { userName: token.usrName, userEmail: token.usrEmail, userId: token.fkUserId, userProps: {} };
                this.userMaps.set(uf);
            }

            if (token.propName) {
                uf.userProps[token.propName] = token.propValue || '';
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
                tf.sessionProps[token.sessionPropName] = token.sessionPropValue || '';
                this.tokenMaps.set(tf);
            }
        }
    }



    private processUsersSelectAll(data: UsersAndPropsMessage[]) {
        this.userMaps.clear();
        for (let user of data) {
            let uf = this.userMaps.get('userId', user.userId);
            if (uf === undefined) {
                uf = Object.assign({}, user, { userProps: {} }) as UserProperties;
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

        let msgCopy = Object.assign({}, msg);
        delete msgCopy.templateName;

        let tokenMsgReply = Object.assign({}, msgCopy, { templateId: templateId }) as TokenMessageReturned;

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
            _user: Object.seal(this.userMaps.get('userId', token.fkUserId || USR_ANONYMOUS) || this.userMaps.get('userId', USR_ANONYMOUS))

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
            return <UserProperties>(this.userMaps.get('userName', USR_ANONYMOUS));
        }
        //
        let rc: UserProperties = Object.assign({}, user, { userProps: deepClone(user.userProps || {}) });

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
            let anoUser = this.userMaps.get('userName', USR_ANONYMOUS);
            if (!anoUser) {
                throw new Error('anonymous user not found in cache');
            }
            _hermes.fkUserId = anoUser.userId;
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

        let oldUser = this.userMaps.get('userId', user.userId);
        let oldProps = (oldUser && oldUser.userProps) || {}; //empty
        let newProps = user.userProps || {};
        let actions: PropertiesModifyMessage[] = [];

        if (user.userName === USR_ANONYMOUS) {
            return Promise.resolve([] as UserPropertiesModifyMessageReturned[]);
        }

        //what to add/modify
        for (let props in newProps) {
            if (oldProps[props] !== newProps[props]) {
                logger.trace('User %s, property userProp[\%s\'] has changed', user.userEmail, props);
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
            logger.trace('User:%s, property %s marked for deletion', user.userName, propNameFiltered, user.userName);
            let rc: PropertiesModifyMessage = { propName: propNameFiltered, propValue: oldProps[propNameFiltered], invisible: true };
            return rc;
        }) as PropertiesModifyMessage[];

        actions.push.apply(actions, deletes);

        if (actions.length > 0) {//nothing to do 
            return this.adaptor.userInsertModifyProperty(<number>(user.userId), actions);
        }
        return Promise.resolve([] as UserPropertiesModifyMessageReturned[]);

    }



    private userInsert(user: UserProperties): Promise<UserMessageReturned> {



        let userAnon = <UserProperties>(this.userMaps.get('userName', USR_ANONYMOUS));
        let rcAnon: UserMessageReturned = deepClone(userAnon);

        if (user.userId === userAnon.userId || user.userName === userAnon.userName) {
            return Promise.resolve(rcAnon);
        }

        if (user.userId === undefined && user.userName === undefined) {
            return Promise.resolve(rcAnon);
        }
        // at this point its not an anonymous user, we could have partial information , make the best of it      
        let oldUser = this.userMaps.get('userId', user.userId);
        if (!oldUser) {
            oldUser = this.userMaps.get('userName', user.userName);
            if (!oldUser) {
                oldUser = this.userMaps.get('userEmail', user.userEmail);
            }
        }

        if (oldUser) { //correct possible mess and resolve
            user.userId = oldUser.userId;
            user.userName = oldUser.userName;
            user.userEmail = oldUser.userEmail;
            let reply: UserMessageReturned = deepClone(user);
            return Promise.resolve(reply);
        }

        let msg: UserMessageBase = deepClone(user);
        logger.trace('Will insert user %j', msg);
        return this.adaptor.userInsert(msg);
    }






    /* specific tooling */
    /* specific tooling */
    /* specific tooling */


    public getAnonymousUser(): UserProperties {
        return <UserProperties>this.userMaps.get('userName', USR_ANONYMOUS);
    }

    public getUserById(userId: number): UserProperties | undefined {
        return this.userMaps.get('userId', userId);
    }

    public getUserByName(userName: string): UserProperties | undefined {
        return this.userMaps.get('userName', userName);
    }

    public getUserByEmail(email: string): UserProperties | undefined {
        return this.userMaps.get('userEmail', email);
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
            let rc = <Express.SessionData>(this.getSession(token.tokenId));
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
            let oldUser = this.userMaps.get('userId', reply.userId) || { userProps: {} };
            updatedUser = Object.assign({}, reply, { userProps: deepClone(oldUser.userProps) });
            this.userMaps.set(updatedUser);
            return this.userPropertiesUpdateInsert(user);
        }).then((reply) => {
            logger.debug('%s: User %s exist/created, has %d properties', sessionId, updatedUser.userName, Object.keys(updatedUser.userProps).length);
            let userProps = updatedUser.userProps;
            for (let msg of reply) {
                if (msg.invisible === true) {
                    delete userProps[msg.propName];
                    continue;
                }
                userProps[msg.propName] = msg.propValue;
            }
            this.userMaps.set(updatedUser);
            token.fkUserId = <number>(updatedUser.userId); // associate
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
