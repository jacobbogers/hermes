
'use strict';
//node
import * as util from 'util';

//express
import express = require('express');
import { Store } from 'express-session';

//app
import { SystemInfo } from './system';

import {
    //general
    AdaptorBase,
    AdaptorError,
    AdaptorWarning,
    PropertiesModifyMessage,
    //tokens
    TemplatePropsMessage,
    TokenMessage,
    TokenMessageReturned,
    TokenPropertiesModifyMessageReturned,
    //user
    TokensAndPropsMessage,
    UserMessageBase,
    UserMessageReturned,
    UserPropertiesModifyMessageReturned,
    //template
    UsersAndPropsMessage
} from './db_adaptor_base';

import Logger from './logger';

const logger = Logger.getLogger();

import {
    deepClone,
    IAnyObjProps,
    makeValueslowerCase,
    MapWithIndexes
} from './utils';

import { Constants } from './property_names';


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
    TOKEN_CHANGE = 1

}


export class HermesStoreError extends Error {

    private _connected: boolean;

    public constructor(message: string, connected: boolean) {
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
    private userMaps: MapWithIndexes<UserProperties, any, any, any, any>;
    private tokenMaps: MapWithIndexes<TokenProperties, any, any, any, any>;
    private templateMaps: MapWithIndexes<TemplateProperties, any, any, any, any>;
    private defaultTemplate: string;


    public constructor(options: HermesStoreProperties) {
        super(options);
        // the express-session object default sets the internal  "storeReady" to true, on creation, make sure this is turned off.
        // this will ensure that the store will disable the middleware by default.
        this.adaptor = options.adaptor;
        this.defaultTemplate = options.defaultCookieOptionsName || <Constants> 'default_cookie';


        const _si = SystemInfo.createSystemInfo();

        this.userMaps = new MapWithIndexes<UserProperties, any, any, any, any>(['userId'], ['userEmail'], ['userName']);
        this.tokenMaps = new MapWithIndexes<TokenProperties, any, any, any, any>(['tokenId'], ['fkUserId', 'purpose', 'tokenId']);
        this.templateMaps = new MapWithIndexes<TemplateProperties, any, any, any, any>(['templateName'], ['id']);

        /* disconnect event added by express-session inner workings*/
        this.once('newListener', (event: string, listener: () => void) => {
            if (event === 'disconnect') {
                if (!this.adaptor.connected) {
                    listener();
                }
            }
        });
        //TODO, fire off initialisation of adaptor,
        this.adaptor.init().then(ok => {
            logger.info('DBAdaptor instance created successfully.[%s]', ok ? 'true' : 'false');
            logger.info('loading templates...');
            return this.adaptor.templateSelectAll();
        }).then(templates => {
            this.processTemplates(templates);
            this.getDefaultCookieOptions(); // will throw if not exist
            logger.info('loading tokens...');
            return this.adaptor.tokenSelectAllByFilter(null, 0, 0);
        }).then(tokens => {
            this.processTokenSelectAll(tokens);
            logger.info('loading users....');
            return this.adaptor.userSelectByFilter();
        }).then(users => {
            this.processUsersSelectAll(users);
            const anonymous = this.userMaps.get({ userName: <Constants> 'anonymous' }).first;
            if (!anonymous) {
                const err = new HermesStoreError(`User ${<Constants> 'anonymous'} doesnt exist`, this.connected);
                _si.addError(err);
                throw err;
            }
            // make user anonymous readonly
            this.userMaps.set(anonymous, true);
            logger.info('...all db data cached');
            this.emit('connect');
        }).catch(err => {
            logger.error('failed because of %j', err);
            const errors = _si.systemErrors(null, Error /*AdaptorError*/);
            AdaptorError;

            logger.error('All adaptor errors #(%d) from the adaptor: %j', errors.length, errors.length ? errors.map(String) : 'NO ERRORS');

            const warnings = _si.systemWarnings(null, AdaptorWarning);
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

        for (const tt of data) {
            const tp: TemplateProperties = {
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

        for (const token of data) {
            //fetch user data
            let uf = this.userMaps.get({ userId: token.fkUserId }).first;

            if (!uf) {
                uf = { userName: token.usrName, userEmail: token.usrEmail, userId: token.fkUserId, userProps: {} };
                this.userMaps.set(uf);
            }

            if (token.propName) {
                uf.userProps[token.propName] = token.propValue || '';
            }

            //fetch token data
            let tf = this.tokenMaps.get({ tokenId: token.tokenId }).first;
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
                    tsExpireCache: token.tsExpire,
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
        for (const userR of data) {
            makeValueslowerCase(userR, 'userEmail', 'userName', 'propName');
            let uf = this.userMaps.get({ userId: userR.userId }).first;
            if (uf === undefined) {
                uf = {
                    userEmail: userR.userEmail,
                    userName: userR.userName,
                    userId: userR.userId,
                    userProps: {}
                };
                this.userMaps.set(uf);
            }
            if (userR.propName) {
                uf.userProps[userR.propName] = userR.propValue;
                this.userMaps.set(uf);
            }
        }
    }


    private tokenPropertiesUpdateInsert(token: TokenProperties): Promise<TokenPropertiesModifyMessageReturned[]> {

        const oldToken = this.tokenMaps.get({ tokenId: token.tokenId }).first;
        const oldSessProps = (oldToken && oldToken.sessionProps) || {}; //empty
        const newSessProps = token.sessionProps || {};
        const actions: PropertiesModifyMessage[] = [];
        //what to add/modify
        logger.debug('%s has %d nr of sessions props to process.', token.tokenId, Object.keys(token.sessionProps).length);
        for (const props in newSessProps) {
            if (oldSessProps[props] !== newSessProps[props]) {
                logger.debug('%s: property %s has changed', token.tokenId, props);
                actions.push({
                    propName: props.toUpperCase(),
                    propValue: newSessProps[props],
                    invisible: false
                });
            }
        }

        const listOfNewProps = Object.keys(newSessProps);

        const deletes = Object.keys(oldSessProps).filter(propName =>
            listOfNewProps.indexOf(propName) === -1).map(propNameFiltered => {
            logger.trace('%s: property %s marked for deletion', token.tokenId, propNameFiltered);

            const rc: PropertiesModifyMessage = { propName: propNameFiltered.toLocaleLowerCase(), propValue: oldSessProps[propNameFiltered], invisible: true };
            return rc;
        });

        actions.push.apply(actions, deletes);
        logger.debug('%s will process %d nr of properties on data-base', token.tokenId, actions.length);
        if (actions.length > 0) {//nothing to do
            return this.adaptor.tokenInsertModifyProperty(token.tokenId, actions);
        }
        return Promise.resolve([] as TokenPropertiesModifyMessageReturned[]);

    }

    private tokenUpdateInsert(_token: TokenProperties): Promise<TokenMessageReturned> {

        let findToken = this.tokenMaps.get({ tokenId: _token.tokenId }).first;
        findToken = findToken || ({} as TokenProperties);
        let changed = false;
        let propName: keyof TokenProperties;
        for (propName in _token) {
            if (['tokenId', 'sessionProps', 'tsExpireCache'].indexOf(propName) >= 0) {
                continue;
            }
            if (propName === 'tsExpire') {
                if ((_token.tsExpire - _token.tsExpireCache) > 3000) {
                    changed = true;
                }
                continue;
            }
            if (findToken[propName] !== _token[propName]) {
                changed = true;
            }
        }
        const stkn: Constants = 'stkn';
        const msg: TokenMessage = {
            tokenId: _token.tokenId,
            fkUserId: _token.fkUserId,
            purpose: _token.purpose || stkn,
            ipAddr: _token.ipAddr,
            tsIssuance: _token.tsIssuance,
            tsRevoked: null,
            revokeReason: null,
            tsExpire: _token.tsExpire,
            templateName: _token.templateName,
            tsExpireCache: changed ? _token.tsExpire : _token.tsExpireCache
        };
        if (changed) {
            logger.info('%s, token will be saved to adaptor', msg.tokenId);
            return this.adaptor.tokenInsertModify(msg);
        }
        logger.trace('token has not changed');
        //
        //convert TokenMessage to TokenMessageReturned
        //
        const template = this.templateMaps.get({ templateName: _token.templateName || '' }).first;
        const templateId = (template && template.id) || null;
        const msgCopy = {...msg};
        delete msgCopy.templateName;

        const tokenMsgReply = {...msgCopy,  templateId} as TokenMessageReturned;

        return Promise.resolve(tokenMsgReply);
    }

    private mapTokenToSession(token: TokenProperties): Express.SessionData {

        const default_cookie: Constants = 'default_cookie';

        const template = this.templateMaps.get({ templateName: token.templateName || default_cookie }).first;
        if (!template) {
            const errStr = util.format('No cookie template found with name: %s', token.templateName || <Constants> 'default_cookie');
            logger.error(errStr);
            throw new Error(errStr);
        }
        const _hermes: TokenProperties = {
            tokenId: token.tokenId,
            fkUserId: token.fkUserId,
            purpose: token.purpose,
            ipAddr: token.ipAddr,
            tsIssuance: token.tsIssuance,
            tsRevoked: token.tsRevoked,
            tsExpire: token.tsExpire,
            tsExpireCache: token.tsExpireCache,
            revokeReason: token.revokeReason,
            templateName: token.templateName,
            sessionProps: deepClone(token.sessionProps)
        };

        const _user = this.userMaps.get({ userId: token.fkUserId || -1 }).first || this.getAnonymousUser();

        const sess: Express.SessionData = {
            id: token.tokenId,
            _hermes,
            cookie: {
                maxAge: <number> template.maxAge,
                originalMaxAge: <number> template.maxAge,
                expires: new Date(token.tsExpire),
                domain: <string> template.domain,
                secure: <boolean> template.secure,
                httpOnly: <boolean> template.httpOnly,
                path: <string> template.path
            },
            _user

        };
        for (const propName in token.sessionProps) {
            sess[propName] = token.sessionProps[propName];
        }
        logger.trace('mapTokenTOSession: %j', sess);
        return sess;
    }

    private stripSessionProps(sess: Express.Session | Express.SessionData): IAnyObjProps {
        const collector: IAnyObjProps = {};

        for (const propName in sess) {
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

        const user = sess['_user'] as UserProperties;

        if (user === undefined) {// no user information, set it to anonymous
            return (this.getAnonymousUser());
        }
        //
        const rc: UserProperties = {...user,  userProps: deepClone(user.userProps || {})};

        //collect props
        for (const propName in user.userProps) {
            let value = user.userProps[propName];
            switch (typeof value) { // need to check can be modified by module consumer.
                case 'string':
                    break;
                case 'number':
                    value = '' + value;
                    break;
                case 'object': //null value will get you here
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
        const _hermes = sess['_hermes'] || {};

        // correct for missing user, set to anonymous
        if (sess['_hermes'] && !_hermes.fkUserId) {// not set? (should never happen) map to "anonymous"
            throw new HermesStoreError('_hermes object exist but has no fkUserId', this.connected);
        }

        const token: TokenProperties = {
            tokenId: sess['id'],
            fkUserId: _hermes && _hermes['fkUserId'],
            purpose: <Constants> 'stkn',
            ipAddr: (sess.req && sess.req.ip) || _hermes['ipAddr'],
            tsIssuance: (_hermes && _hermes['tsIssuance']) || Date.now(),
            tsRevoked: (_hermes && _hermes['tsRevoked']) || null,
            tsExpireCache: (_hermes && _hermes['tsExpireCache']) || sess.cookie.expires.valueOf() as number,
            tsExpire: sess.cookie.expires.valueOf() as number,
            revokeReason: (_hermes && _hermes['revokeReason']) || null,
            templateName: (_hermes && _hermes['templateName']) || this.defaultTemplate,
            sessionProps: this.stripSessionProps(sess)
        };

        logger.debug('session: %s, expire: %d sec', token.tokenId, Math.round((token.tsExpire - Date.now()) / 3600));
        logger.debug('session: %s, template: %s', token.tokenId, token.templateName);
        logger.trace('session: %s, sessionProps: %j', token.tokenId, token.sessionProps);
        return token;
    }

    private getSession(sessionId: string): Express.SessionData | undefined {

        const token = this.tokenMaps.get({ tokenId: sessionId }).first;

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
        const stkn: Constants = 'stkn';
        if (token.purpose !== stkn) {
            logger.error('INTERNAL INCONSISTANCY: token "%s" is NOT a cookie but appears in a cookie header', sessionId);
            return;
        }
        return this.mapTokenToSession(token);
    }

    /* users */
    /* users */
    /* users */

    private userPropertiesUpdateInsert(user: UserProperties): Promise<UserPropertiesModifyMessageReturned[]> {

        const oldUser = this.userMaps.get({ userId: user.userId }).first;
        const oldProps = (oldUser && oldUser.userProps) || {}; //empty
        const newProps = user.userProps || {};
        const actions: PropertiesModifyMessage[] = [];

        if (user.userName === <Constants> 'anonymous') {
            return Promise.resolve([] as UserPropertiesModifyMessageReturned[]);
        }

        //what to add/modify
        for (const props in newProps) {
            if (oldProps[props] !== newProps[props]) {
                logger.trace('User (email) %s, property [\'%s\'] has changed', user.userEmail, props);
                actions.push({
                    propName: props,
                    propValue: newProps[props],
                    invisible: false
                });
            }
        }

        const listOfNewProps = Object.keys(newProps);

        const deletes = Object.keys(oldProps).filter(propName =>
            listOfNewProps.indexOf(propName) === -1).map(propNameFiltered => {
            logger.trace('User:%s, property %s marked for deletion', user.userName, propNameFiltered, user.userName);
            const rc: PropertiesModifyMessage = { propName: propNameFiltered, propValue: oldProps[propNameFiltered], invisible: true };
            return rc;
        });

        actions.push.apply(actions, deletes);

        return this.adaptor.userInsertModifyProperty((user.userId), actions);
    }


    private userFetchOrInsertNew(user: UserProperties): Promise<UserMessageReturned> {

        const userAnon = this.getAnonymousUser();

        if (user.userId === userAnon.userId || user.userName === userAnon.userName) {
            return Promise.resolve(<UserMessageReturned> userAnon);
        }

        if (user.userId === undefined && user.userName === undefined) {
            return Promise.resolve(<UserMessageReturned> userAnon);
        }
        // at this point its not an anonymous user, we could have partial information to identify user
        let findUser = this.getUserById(user.userId);
        if (!findUser) {
            findUser = this.getUserByName(user.userName);
            if (!findUser) {
                findUser = this.userMaps.get({ userEmail: user.userEmail }).first;
            }
        }

        if (findUser) { //correct possible mess and resolve
            logger.debug('user found in store-cache:%s', user.userName);
            user.userId = findUser.userId;
            user.userName = findUser.userName;
            user.userEmail = findUser.userEmail;
            const reply: UserMessageReturned = deepClone(user);
            return Promise.resolve(reply);
        }

        // at this point a new user will be created and inserted into the db
        const msg: UserMessageBase = {
            userEmail: user.userEmail,
            userName: user.userName
        };
        logger.trace('New user, insert into DB %j', msg);
        return this.adaptor.userInsert(msg);
    }

    /* specific tooling */
    /* specific tooling */
    /* specific tooling */


    public requestResetPw(email: string, ipAddr: string): Promise<TokenProperties> {

        email = email.toLocaleLowerCase();
        const fu = this.userMaps.get({ userEmail: email }).first;
        if (!fu) {
            return Promise.reject(new HermesStoreError('user with this email doesnt exist', this.connected));
        }
        const u = fu;
        const purpose: Constants = 'rstp';
        const revoke_reason: Constants = 'RE';
        const default_template: Constants = 'default_token';
        return this.adaptor.tokenInsertRevoke(u.userId, purpose, ipAddr, revoke_reason).then((tmr: TokenMessageReturned) => {

            const rc: TokenProperties = {
                tokenId: tmr.tokenId,
                sessionProps: {},
                templateName: default_template,
                fkUserId: tmr.fkUserId,
                purpose: tmr.purpose,
                ipAddr: tmr.ipAddr,
                tsIssuance: tmr.tsIssuance,
                tsRevoked: null,
                revokeReason: null,
                tsExpire: tmr.tsExpire,
                tsExpireCache: tmr.tsExpireCache
            };

            //get old reset keys and revoke them in the store aswell
            const collected = this.tokenMaps.get({ fkUserId: u.userId, purpose }).collected;
            let nrRevoked = 0;
            if (collected) {
                for (const token of collected) {
                    if (token.revokeReason !== null) {
                        continue;
                    }
                    token.revokeReason = 'RE';
                    token.tsRevoked = Date.now();
                    this.tokenMaps.set(token);
                    nrRevoked++;
                }
            }
            this.tokenMaps.set(rc);
            return rc;
        });
    }

    public getAnonymousUser(): UserProperties {
        const anon: Constants = 'anonymous';
        const rc = this.userMaps.get({ userName: anon }).first;
        if (!rc) {
            throw new HermesStoreError('no anonymous user', this.connected);
        }
        return rc;
    }

    public getUserById(userId: number): UserProperties | undefined {
        return this.userMaps.get({ userId }).first;
    }

    public getUserByName(userName: string): UserProperties | undefined {
        userName = userName.toLocaleLowerCase();
        return this.userMaps.get({ userName }).first;
    }

    public getUserByEmail(email: string): UserProperties | undefined {
        email = email.toLocaleLowerCase();
        return this.userMaps.get({ userEmail: email }).first;
    }

    public getTemplateById(id: number): TemplateProperties | undefined {
        return this.templateMaps.get({ id }).first;
    }

    public getTemplateByName(name: string): TemplateProperties | undefined {
        name = name.toLocaleLowerCase();
        return this.templateMaps.get({ templateName: name }).first;
    }

    public getTokenById(id: string): TokenProperties | undefined {
        return this.tokenMaps.get({ tokenId: id }).first;
    }

    public get connected() {
        return this.adaptor.connected;
    }

    public getCookieOptions(templateName: string): express.CookieOptions {
        if (!this.connected) {
            throw new Error('The Store is not "connected" and in a usable state');
        }
        const opt = this.getTemplateByName(templateName);
        if (opt === undefined) {
            const err = util.format('No Cookie template found for name: "%s"', templateName);
            logger.error(err);
            throw new Error(err);
        }
        const rc: express.CookieOptions = {
            maxAge: opt.maxAge || undefined,
            //signed: true,
            //expires:
            httpOnly: opt.httpOnly || undefined,
            path: opt.path || undefined,
            domain: opt.domain || undefined,
            secure: opt.secure || undefined,
            //encode
            sameSite: opt.sameSite || undefined
        };
        return rc;
    }

    public getDefaultCookieOptions() {
        return this.getCookieOptions(this.defaultTemplate || <Constants> 'default_cookie');
    }


    public updateUserProperties(user: UserProperties): Promise<UserProperties> {
        const self = this;

        return this.userPropertiesUpdateInsert(user) //update user in database first
            .then(function afterUserPropertiesInsert(reply) {
                logger.debug('user %s had %d property-mutations', user.userName, reply.length);
                const userProps = user.userProps;
                for (const msg of reply) {
                    if (msg.invisible) {
                        delete userProps[msg.propName];
                        continue;
                    }
                    userProps[msg.propName] = msg.propValue;
                }
                self.userMaps.set(user); // sync mem-cache as well
                return user;
            });
    }

    public updateToken(token: TokenProperties): Promise<TokenProperties> {

        const self = this;
        return self.tokenUpdateInsert(token)
            .then(function afterTokenUpdateInsert(reply) {
                logger.debug('%s: token updated, type %s', token.tokenId, token.purpose);
                //
                //convert from template_id to template_name
                const template = self.getTemplateById(reply.templateId || -1);
                delete reply.templateId;
                Object.assign(token, reply); //update token with returned values
                const updatedToken = {...reply,
                                      templateName: template && template.templateName,
                                      sessionProps: token.sessionProps} as TokenProperties;
                //partially update the token in cache to reflect database change
                self.tokenMaps.set(updatedToken);
                return updatedToken;
            });
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

    public all(callback: CallBack<SessionHash>): void  {

        const allSessions = this.tokenMaps.values().filter(token =>
            token.purpose === <Constants> 'stkn').map(token => {
            const rc = <Express.SessionData> (this.getSession(token.tokenId));
            return rc;
        });
        //we have all sessions as an array
        const rc = allSessions.reduce((hash, sess) => {
            const key = sess['id'] as string;
            hash[key] = sess;
            return hash;
        },                            {} as SessionHash);
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
        const token = this.getTokenById(sessionId);
        if (token) {
            const tc = token; // typescript typeguard above only goes so many levels of nesting
            const self = this;
            token.tsRevoked = Date.now();
            token.revokeReason = 'destruction';
            this.tokenUpdateInsert(token)
                .then(() =>
                    undefined)
                .catch(err => { //error can be many things, best to let all middleware fail after this.
                    return err;
                })
                .then(err => {
                    self.tokenMaps.set(tc);
                    callback && defer(callback, err);
                });
        }
    }

    /**
     * Commit the given session associated with the given sessionId to the store.
     *
     * @param {string} sessionId
     * @param {object} session
     * @param {function} callback
     * @public
     */

    public get(sessionId: string, callback: CallBack<Express.Session>) {
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
    public set(sessionId: string, session: Express.Session, callback: CallBack<Express.Session>): void {

        logger.debug('sessionId: %s', sessionId);

        //token
        const token = this.mapSessionToToken(session); // actual goes here
        const oldToken = this.getTokenById(token.tokenId) || { sessionProps: {} };
        let updatedToken: TokenProperties;
        //user
        let user = this.mapSessionToUser(session);

        let updatedUser: UserProperties;
        //
        const self = this;
        this.userFetchOrInsertNew(user).then(function afterUserInsert(reply) {
            logger.trace('session: %s, user [%s] association.', sessionId, reply.userName);
            //different id's?
            user = {
                ...reply,
                userProps: { ...user.userProps }
            };
            //console.log('user:', user);
            const findUser = self.getUserById(reply.userId) || { userProps: {} };
            // partially change user and update to cache
            updatedUser = {
                ...reply,
                userProps: { ...findUser.userProps }
            };
            self.userMaps.set(updatedUser);
            return self.userPropertiesUpdateInsert(user); //will use updatedUser in cache to create mutation records for properties
        }).then(function afterUserPropertiesInsert(reply) {
            logger.debug('user %s had %d property-mutations', updatedUser.userName, reply.length);
            const userProps = updatedUser.userProps;
            for (const msg of reply) {
                if (msg.invisible) {
                    delete userProps[msg.propName];
                    continue;
                }
                userProps[msg.propName] = msg.propValue;
            }
            self.userMaps.set(updatedUser);
            token.fkUserId = (updatedUser.userId); // associate
            return self.tokenUpdateInsert(token);
        }).then(function afterTokenUpdateInsert(reply) {
            logger.debug('%s: token updated', sessionId);
            //
            //convert from template_id to template_name
            const template = self.getTemplateById(reply.templateId || -1);
            delete reply.templateId;
            Object.assign(token, reply); //update token with returned values

            updatedToken = {...reply,
                            templateName: template && template.templateName,
                            sessionProps: oldToken.sessionProps} as TokenProperties;
            //partially update the token in cache to reflect database change

            self.tokenMaps.set(updatedToken);
            return self.tokenPropertiesUpdateInsert(token);
        }).then(function afterTokenPropertiesUpdateInsert(replyTokenPropertyMessages) {
            logger.debug('%s: sessionProps updated', sessionId);
            const sessionProps = updatedToken.sessionProps;
            for (const msg of replyTokenPropertyMessages) {
                if (msg.invisible) {
                    delete sessionProps[msg.propName];
                    continue;
                }
                sessionProps[msg.propName] = msg.propValue;
            }
            self.tokenMaps.set(updatedToken);
            //process change in user properties and user name
            return Promise.resolve('DONE');
        }).then(function final() {
            logger.debug('finalize session %s', token.tokenId);
            /* this only happens if the sessionId is newly created */
            if (!session._hermes || !session._user) {
                logger.trace('monkey patching session %s', token.tokenId);
                const sess = self.mapTokenToSession(updatedToken);
                logger.info('session:%s, newly created: %j', token.tokenId, sess);
                session._hermes = session._hermes || sess._hermes;
                session._user = session._user || sess._user;
            }
            callback && defer(callback);
        }).catch(err => {
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
        const storedSession = this.getSession(sessionId); //possibly expires the session and returns null
        if (storedSession) {
            // update expiration
            storedSession.cookie = session.cookie;

            const token = this.mapSessionToToken(storedSession);

            this.tokenUpdateInsert(token).then(replyTokenMessage => {
                // for now we glue sessionProps to this. , normally there is an update sequence here
                Object.assign(token, replyTokenMessage); //update token with returned values
                const template = this.getTemplateById(replyTokenMessage.templateId || -1);
                delete replyTokenMessage.templateId;
                const returnedToken = {...replyTokenMessage,  templateName: template && template.templateName, sessionProps: token.sessionProps} as TokenProperties;
                this.tokenMaps.set(returnedToken);
                if (!session._hermes || !session._user) {
                    const sess = this.mapTokenToSession(returnedToken);
                    session._hermes = session._hermes || sess._hermes;
                    session._user = session._user || sess._user;
                }
                callback && defer(callback);
            }).catch(err => {
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

    public length(callback: CallBack<number>): void  {
        const length = this.tokenMaps.length();
        logger.debug('"length" function called', length);
        callback(null, length);
    }

}
