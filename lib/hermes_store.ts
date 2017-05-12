
import { Store } from 'express-session';

//import * as express from 'express';
import {
    AdaptorBase,
    TokensAndPropsMessage,
    TemplatePropsMessage,
    PropertyModifyMessage,
    PropertyModifyMessageReturned,
    UsersAndPropsMessage,
    TokenMessage,
    TokenMessageReturned
} from './db_adaptor_base';

import { logger } from './logger';

import {
    MapWithIndexes,
    staticCast,
    AnyObjProps
} from './utils';

import * as util from 'util';
util;

import express = require('express');





const STKN = 'STKN';

export interface SessionHash {
    [sid: string]: Express.SessionData;
}

export interface UserProperties {
    name: string;
    email: string;
    id: number;
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
        this.defaultTemplate = options.defaultCookieOptionsName || 'default_cookie';

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
            logger.trace('DBAdaptor instance created successfully.[%s]', ok ? 'true' : 'false');
            logger.trace('loading templates...');
            return this.adaptor.templateSelectAll();
        }).then((templates) => {
            this.processTemplates(templates);
            logger.trace('loading tokens...');
            return this.adaptor.tokenSelectAllByFilter(null, 0, 0);
        }).then((tokens) => {
            this.processTokenSelectAll(tokens);
            logger.trace('loading users....');
            return this.adaptor.userSelectByFilter();
        }).then((users) => {

            this.processUsersSelectAll(users);
            logger.info('...all db data cached');
            this.emit('connect');
        }).catch(() => {
            logger.error('Failure to initialze adaptor: %j', this.adaptor.errors);
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
        this.templateMaps.clear();
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
            this.templateMaps.set(tp);
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


    private tokenPropertiesUpdateInsert(token: TokenProperties): Promise<PropertyModifyMessageReturned[]> {

        let oldToken = this.tokenMaps.get('tokenId', token.tokenId);
        let oldSessProps = (oldToken && oldToken.sessionProps) || {}; //empty
        let newSessProps = token.sessionProps || {};
        let actions: PropertyModifyMessage[] = [];
        //what to add/modify

        for (let props in newSessProps) {
            if (oldSessProps[props] !== newSessProps[props]) {
                logger.warn('token %s, property %s has changed', token.tokenId, props);
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
            logger.warn('token %s, property %s marked for deletion', token.tokenId, propNameFiltered);

            let rc: PropertyModifyMessage = { propName: propNameFiltered, propValue: oldSessProps[propNameFiltered], invisible: true };
            return rc;
        }) as PropertyModifyMessage[];

        actions.push.apply(actions, deletes);

        if (actions.length > 0) {//nothing to do 
            return this.adaptor.tokenInsertModifyProperty(token.tokenId, actions);
        }
        return Promise.resolve([] as PropertyModifyMessageReturned[]);

    }

    private tokenUpdateInsert(token: TokenProperties): Promise<TokenMessageReturned> {

        let oldToken = this.tokenMaps.get('tokenId', token.tokenId) || {} as TokenProperties;
        //console.log('token in store:', oldToken);
        //console.log('token new:', token);
        let changed = false;
        let propName: keyof TokenProperties;
        for (propName in oldToken) {
            if (['tokenId', 'sessionProps'].indexOf(propName) >= 0) {
                continue;
            }
            if (oldToken[propName] !== token[propName]) {
                logger.warn('propname %s has changed old:%j  new:%j', propName, oldToken[propName], token[propName]);
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
            logger.warn('token main attributes has changed');
            return this.adaptor.tokenInsertModify(msg);
        }
        logger.error('token has not changed');

        //convert TokenMessage to TokenMessageReturned
        let template = this.templateMaps.get('templateName', token.templateName || '');
        let templateId = (template && template.id) || null;
        let tokenMsgReply = Object.assign({}, msg, { templateId: templateId }) as TokenMessageReturned;

        delete staticCast<TokenMessage>(tokenMsgReply).templateName;
        return Promise.resolve(tokenMsgReply);
    }

    private mapTokenToSession(token: TokenProperties): Express.SessionData {

        let template = this.templateMaps.get('templateName', token.templateName || 'default_cookie');
        if (template === undefined) {
            let errStr = util.format('No cookie template found with name: %s', token.templateName || 'default_cookie');
            logger.error(errStr);
            throw new Error(errStr);
        }
        let sess: Express.SessionData = {
            id: token.tokenId,
            _hermes: {
                tokenId: token.tokenId,
                fkUserId: token.fkUserId,
                purpose: token.purpose,
                ipAddr: token.ipAddr,
                tsIssuance: token.tsIssuance,
                tsRevoked: token.tsRevoked,
                tsExpire: token.tsExpire,
                revokeReason: token.revokeReason,
                templateName: token.templateName
            } as TokenProperties,
            cookie: {
                maxAge: template.maxAge,
                originalMaxAge: template.maxAge,
                expires: new Date(token.tsExpire),
                domain: template.domain,
                secure: template.secure,
                httpOnly: template.httpOnly,
                path: template.path
            },
            _user: this.userMaps.get('id', token.fkUserId as number)

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

    private mapSessionToToken(sess: Express.Session | Express.SessionData): TokenProperties {

        // what we need is set the expire datum 
        // TODO: re populate the session_properties and user properties map
        let _hermes = sess['_hermes'] || {};

        // correct for missing user, set to anonymous
        if (!_hermes || !_hermes.fkUserId) {// not set? (should never happen) map to "anonymous"
            let anoUser = this.userMaps.get('name', 'anonymous');
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

        if (token.revokeReason) {
            logger.debug('token "%s" was revoked:', sessionId);
            return;
        }

        if (token.tsExpire <= new Date().getTime()) {
            logger.debug('token "%s" expired ,token %j', sessionId, token);
            return;
        }

        if (token.purpose !== STKN) {
            logger.error('token "%s" is NOT a cookie but appears in a cookie header', sessionId);
            return;
        }
        return this.mapTokenToSession(token);
    }

    public get connected() {
        return this.adaptor.connected;
    }

    public getTemplate(templateName: string): express.CookieOptions {
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

    public getDefaultTemplate() {
        return this.getTemplate(this.defaultTemplate || 'default_cookie');
    }


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
        //throw new Error('stack trace');
        logger.debug('set session by sessionId: %s', sessionId);
        //session.id =
        sessionId;
        let token = this.mapSessionToToken(session); // actual goes here
        let oldToken = this.tokenMaps.get('tokenId', token.tokenId) || { sessionProps: {} };
        let updatedToken: TokenProperties;
        this.tokenUpdateInsert(token).then((replyTokenMessage) => {
            // for now we glue sessionProps to this. , normally there is an update sequence here
            logger.debug('Main token record updated for %s', sessionId);
            Object.assign(token, replyTokenMessage); //update token with returned values

            let template = this.templateMaps.get('id', replyTokenMessage.templateId || -1);
            delete replyTokenMessage.templateId;
            updatedToken = Object.assign({}, replyTokenMessage, { templateName: template && template.templateName, sessionProps: oldToken.sessionProps }) as TokenProperties;
            //partially update the token in cache to reflect database change
            this.tokenMaps.set(updatedToken);
            return this.tokenPropertiesUpdateInsert(token);
        }).then((replyTokenPropertyMessages) => {
            let sessionProps = updatedToken.sessionProps;
            for (let msg of replyTokenPropertyMessages) {
                if (msg.invisible === true) {
                    delete sessionProps[msg.propName];
                    continue;
                }
                sessionProps[msg.propName] = msg.propValue;
            }
            this.tokenMaps.set(updatedToken);
            if (!session._hermes || !session._user) {
                let sess = this.mapTokenToSession(updatedToken);
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
