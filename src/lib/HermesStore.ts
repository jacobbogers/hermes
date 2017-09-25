// Vendor
import {  CookieOptions } from 'express';
import { Store } from 'express-session';
import * as util from 'util';

// App
import { SystemInfo } from './system';

// Adaptors
import {
  // General
  AdaptorBase,
  AdaptorError,
  AdaptorWarning
} from './adaptors';

import {
  ITokenMessage,
  ITokenMessageReturned,
  ITokenPropertiesModifyMessageReturned,
  ITokensAndPropsMessage
} from '~tokens';

import { IPropertiesModifyMessage } from '~properties/IPropertiesModifyMessage';

import { ITemplatePropsMessage } from '~templates';

import {
  IUserMessageBase,
  IUserMessageReturned,
  IUserPropertiesModifyMessageReturned,
  IUsersAndPropsMessage
} from '~users';

import {
  IHermesStoreProperties,
  ITemplateProperties,
  ITokenProperties,
  IUserProperties
} from '~hermes-props';


import { Logger } from './logger';
const logger = Logger.getLogger();

import {
  copyProperties,
  deepClone,
  IAnyObjProps,
  isFunction,
  makeValuesLowerCase,
  MapWithIndexes
} from '~lib/utils';

import { GraphQLStatusCodes } from '~graphql/GraphQLStatusCodes';
import { HermesStoreError } from './HermesStoreError';

export interface ISessionHash {
  [sid: string]: Express.SessionData;
}
/*
export interface User {
    name: string;
    email: string;
    id: number;
}*/

export enum AdaptorInstructionSet {
  NOP = 0,
  TOKEN_CHANGE = 1
}

/**
 * how to use this store;
 * create first and connect to express-session object
 * the express-session object default sets the internal  "storeReady" to true, on creation, make sure this is turned off
 *
 */

export type CallBack<T> = (err: any, obj: T) => void;

const defer =
  window && isFunction(window.setImmediate)
    ? setImmediate
    : (fn: Function, ...rest: any[]) => {
        global.process.nextTick(fn.bind.call(fn, rest));
      };

export class HermesStore extends Store {


  private adaptor: AdaptorBase;
  private userMaps: MapWithIndexes<IUserProperties, any, any, any, any>;
  private tokenMaps: MapWithIndexes<ITokenProperties, any, any, any, any>;
  private templateMaps: MapWithIndexes<ITemplateProperties, any, any, any, any>;
  private defaultTemplate: string;


  public constructor(options: IHermesStoreProperties) {
    super(options);
    // Plug in properties
    this.init();
    // The express-session object default sets the internal  "storeReady" to true, on creation, make sure this is turned off.
    // This will ensure that the store will disable the middleware by default.
    this.adaptor = options.adaptor;
    this.defaultTemplate =
      options.defaultCookieOptionsName || <GraphQLStatusCodes> 'default_cookie';

    const _si = SystemInfo.createSystemInfo();

    this.userMaps = new MapWithIndexes<IUserProperties, any, any, any, any>(
      ['userId'],
      ['userEmail'],
      ['userName']
    );
    this.tokenMaps = new MapWithIndexes<ITokenProperties, any, any, any, any>(
      ['tokenId'],
      ['fkUserId', 'purpose', 'tokenId']
    );
    this.templateMaps = new MapWithIndexes<
      ITemplateProperties,
      any,
      any,
      any,
      any
    >(['templateName'], ['id']);

    /* disconnect event added by express-session inner workings*/
    this.once('newListener', (event: string, listener: () => void) => {
      if (event === 'disconnect') {
        if (!this.adaptor.connected) {
          listener();
        }
      }
    });
    // TODO, fire off initialisation of adaptor,
    this.adaptor
      .init()
      .then(async  ok  => {
        logger.info(
          'DBAdaptor instance created successfully.[%s]',
          ok ? 'true' : 'false'
        );
        logger.info('loading templates...');

        return this.adaptor.templateSelectAll();
      })
      .then(async templates => {
        this.processTemplates(templates);
        this.getDefaultCookieOptions(); // Will throw if not exist
        logger.info('loading tokens...');

        return this.adaptor.tokenSelectAllByFilter(null, 0, 0);
      })
      .then(async tokens => {
        this.processTokenSelectAll(tokens);
        logger.info('loading users....');

        return this.adaptor.userSelectByFilter();
      })
      .then(users => {
        this.processUsersSelectAll(users);
        const anonymous = this.userMaps.get({
          userName: <GraphQLStatusCodes> 'anonymous'
        }).first;
        if (!anonymous) {
          const status: GraphQLStatusCodes = 'anonymous';
          const err = new HermesStoreError(
            `User ${status} doesnt exist`,
            this.connected
          );
          _si.addError(err);
          throw err;
        }
        // Make user anonymous readonly
        this.userMaps.set(anonymous, true);
        logger.info('...all db data cached');
        this.emit('connect');
      })
      .catch(err => {
        logger.error('failed because of %j', err);
        const errors = _si.systemErrors(null, Error /*AdaptorError*/);
        AdaptorError;

        logger.error(
          'All adaptor errors #(%d) from the adaptor: %j',
          errors.length,
          errors.length ? errors.map(String) : 'NO ERRORS'
        );

        const warnings = _si.systemWarnings(null, AdaptorWarning);
        logger.warn(
          'All warnings #(%d) from the adaptor %j',
          warnings.length,
          warnings.length ? warnings : 'NO WARNINGS'
        );

        this.adaptor.emit('disconnect');
      });

    // Wire it up
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

  /* specific tooling */
  /* specific tooling */
  /* specific tooling */

  public async requestResetPw(
    _email: string,
    ipAddr: string
  ): Promise<ITokenProperties> {
    const email = _email.toLocaleLowerCase();
    const fu = this.userMaps.get({ userEmail: email }).first;
    if (!fu) {
      return Promise.reject(
        new HermesStoreError(
          'user with this email doesnt exist',
          this.connected
        )
      );
    }
    const u = fu;
    const purpose: GraphQLStatusCodes = 'rstp';
    const revokeReason: GraphQLStatusCodes = 'RE';
    const defaultTemplate: GraphQLStatusCodes = 'default_token';

    return this.adaptor
      .tokenInsertRevoke(u.userId, purpose, ipAddr, revokeReason)
      .then((tmr: ITokenMessageReturned) => {
        const rc: ITokenProperties = {
          fkUserId: tmr.fkUserId,
          ipAddr: tmr.ipAddr,
          purpose: tmr.purpose,
          revokeReason: null,
          sessionProps: {},
          templateName: defaultTemplate,
          tokenId: tmr.tokenId,
          tsExpire: tmr.tsExpire,
          tsExpireCache: tmr.tsExpireCache,
          tsIssuance: tmr.tsIssuance,
          tsRevoked: null
        };

        // Get old reset keys and revoke them in the store aswell
        const collected = this.tokenMaps.get({ fkUserId: u.userId, purpose })
          .collected;
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

  public getAnonymousUser(): IUserProperties {
    const anon: GraphQLStatusCodes = 'anonymous';
    const rc = this.userMaps.get({ userName: anon }).first;
    if (!rc) {
      throw new HermesStoreError('no anonymous user', this.connected);
    }

    return rc;
  }

  public getUserById(userId: number): IUserProperties | undefined {
    return this.userMaps.get({ userId }).first;
  }

  public getUserByName(_userName: string): IUserProperties | undefined {
    const userName = _userName.toLocaleLowerCase();

    return this.userMaps.get({ userName }).first;
  }

  public getUserByEmail(_email: string): IUserProperties | undefined {
    const email = _email.toLocaleLowerCase();

    return this.userMaps.get({ userEmail: email }).first;
  }

  public getTemplateById(id: number): ITemplateProperties | undefined {
    return this.templateMaps.get({ id }).first;
  }

  public getTemplateByName(_name: string): ITemplateProperties | undefined {
    const name = _name.toLocaleLowerCase();

    return this.templateMaps.get({ templateName: name }).first;
  }

  public getTokenById(id: string): ITokenProperties | undefined {

    return this.tokenMaps.get({ tokenId: id }).first;

  }

  public get connected() {
    return this.adaptor.connected;
  }

  public getCookieOptions(templateName: string): CookieOptions {
    if (!this.connected) {
      throw new Error('The Store is not "connected" and in a usable state');
    }
    const opt = this.getTemplateByName(templateName);
    if (opt === undefined) {
      const err = util.format(
        'No Cookie template found for name: "%s"',
        templateName
      );
      logger.error(err);
      throw new Error(err);
    }
    const rc: CookieOptions = {
      domain: opt.domain || undefined,
      httpOnly: opt.httpOnly || undefined,
      maxAge: opt.maxAge || undefined,
      path: opt.path || undefined,
      sameSite: opt.sameSite || undefined,
      secure: opt.secure || undefined

    };

    return rc;
  }

  public getDefaultCookieOptions() {
    return this.getCookieOptions(
      this.defaultTemplate || <GraphQLStatusCodes> 'default_cookie'
    );
  }

  public async updateUserProperties(user: IUserProperties): Promise <IUserProperties > {
    const self = this;

    return this.userPropertiesUpdateInsert(user) // Update user in database first
      .then(async function afterUserPropertiesInsert(reply) {
        logger.debug(
          'user %s had %d property-mutations',
          user.userName,
          reply.length
        );
        const userProps = user.userProps;
        for (const msg of reply) {
          if (msg.invisible) {
            delete userProps[msg.propName];
            continue;
          }
          userProps[msg.propName] = msg.propValue;
        }
        self.userMaps.set(user); // Sync mem-cache as well

        return user;
      });
  }

  public async updateToken(token: ITokenProperties): Promise <ITokenProperties> {
    const self = this;

    return self
      .tokenUpdateInsert(token)
      .then(async function afterTokenUpdateInsert(reply) {
        logger.debug(
          '%s: token updated, type %s',
          token.tokenId,
          token.purpose
        );
        //
        // Convert from template_id to template_name
        const template = self.getTemplateById(reply.templateId || -1);
        delete reply.templateId;
        Object.assign(token, reply); // Update token with returned values
        const updatedToken: ITokenProperties = {
          ...(reply as any)
        };
        updatedToken.templateName = template && template.templateName || null,
        updatedToken.sessionProps = token.sessionProps;

        // Partially update the token in cache to reflect database change
        self.tokenMaps.set(updatedToken);

        return updatedToken;
      });
  }

  /* interface methods of Store */
  /* interface methods of Store */
  /* interface methods of Store */

  /**
   * Commit the given session associated with the given sessionId to the store.
   *
   * @param {string} sessionId
   * @param {object} session
   * @param {function} callback
   * @public
   *
   */
  /*
*/

  /**
   * Get number of active sessions.
   *
   * @param {function} callback
   * @public
   */

  /*public length(callback: CallBack<number>): void {
    const length = this.tokenMaps.length();
    logger.debug('"length" function called', length);
    callback(null, length);
  }
  */

  private processTemplates(data: ITemplatePropsMessage[]) {
    for (const tt of data) {
      const tp: ITemplateProperties = {
        cookieName: tt.cookieName,
        domain: tt.domain,
        httpOnly: tt.httpOnly,
        id: tt.id,
        maxAge: tt.maxAge,
        path: tt.path,
        rolling: tt.rolling,
        sameSite: tt.sameSite,
        secure: tt.secure,
        templateName: tt.templateName
      };
      this.templateMaps.set(tp, true);
    }
  }

  private processTokenSelectAll(data: ITokensAndPropsMessage[]) {
    for (const token of data) {
      // Fetch user data
      let uf = this.userMaps.get({ userId: token.fkUserId }).first;

      if (!uf) {
        uf = {
          userEmail: token.usrEmail,
          userId: token.fkUserId,
          userName: token.usrName,
          userProps: {}
        };
        this.userMaps.set(uf);
      }

      if (token.propName) {
        uf.userProps[token.propName] = token.propValue || '';
      }

      // Fetch token data
      let tf = this.tokenMaps.get({ tokenId: token.tokenId }).first;
      if (!tf) {
        tf = {
          fkUserId: token.fkUserId,
          ipAddr: token.ipAddr,
          purpose: token.purpose,
          revokeReason: token.revokeReason,
          sessionProps: {},
          templateName: token.templateName,
          tokenId: token.tokenId,
          tsExpire: token.tsExpire,
          tsExpireCache: token.tsExpire,
          tsIssuance: token.tsIssuance,
          tsRevoked: token.tsRevoked
        };
        this.tokenMaps.set(tf);
      }
      if (
        token.sessionPropName &&
        ['id', 'cookie', '_hermes', '_user'].indexOf(token.sessionPropName) ===
          -1
      ) {
        tf.sessionProps[token.sessionPropName] = token.sessionPropValue || '';
        this.tokenMaps.set(tf);
      }
    }
  }

  private processUsersSelectAll(data: IUsersAndPropsMessage[]) {
    this.userMaps.clear();
    for (const userR of data) {
      makeValuesLowerCase(userR, 'userEmail', 'userName', 'propName');
      let uf = this.userMaps.get({ userId: userR.userId }).first;
      if (uf === undefined) {
        uf = {
          userEmail: userR.userEmail,
          userId: userR.userId,
          userName: userR.userName,
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

  private async tokenPropertiesUpdateInsert(
    token: ITokenProperties
  ): Promise < ITokenPropertiesModifyMessageReturned[] > {
    const oldToken = this.tokenMaps.get({ tokenId: token.tokenId }).first;
    const oldSessProps = (oldToken && oldToken.sessionProps) || {}; // Empty
    const newSessProps = token.sessionProps || {};
    const actions: IPropertiesModifyMessage[] = [];
    // What to add/modify
    logger.debug(
      '%s has %d nr of sessions props to process.',
      token.tokenId,
      Object.keys(token.sessionProps).length
    );
    for (const props in newSessProps) {
      if (oldSessProps[props] !== newSessProps[props]) {
        logger.debug('%s: property %s has changed', token.tokenId, props);
        actions.push({
          invisible: false,
          propName: props.toUpperCase(),
          propValue: newSessProps[props]
        });
      }
    }

    const listOfNewProps = Object.keys(newSessProps);

    const deletes = Object.keys(oldSessProps)
      .filter(propName => listOfNewProps.indexOf(propName) === -1)
      .map(propNameFiltered => {
        logger.trace(
          '%s: property %s marked for deletion',
          token.tokenId,
          propNameFiltered
        );

        const rc: IPropertiesModifyMessage = {
          invisible: true,
          propName: propNameFiltered.toLocaleLowerCase(),
          propValue: oldSessProps[propNameFiltered]
        };

        return rc;
      });

    actions.push.apply(actions, deletes);
    logger.debug(
      '%s will process %d nr of properties on data-base',
      token.tokenId,
      actions.length
    );
    if (actions.length > 0) {
      // Nothing to do
      return this.adaptor.tokenInsertModifyProperty(token.tokenId, actions);
    }


    return Promise.resolve([] as ITokenPropertiesModifyMessageReturned[]);
  }

  private async tokenUpdateInsert(
    _token: ITokenProperties
  ): Promise <ITokenMessageReturned> {
    const findToken = this.tokenMaps.get({ tokenId: _token.tokenId }).first;
    let changed = false;
    let propName: keyof ITokenProperties;
    for (propName in _token) {
      if (['tokenId', 'sessionProps', 'tsExpireCache'].indexOf(propName) >= 0) {
        continue;
      }
      if (propName === 'tsExpire') {
        if (_token.tsExpire - _token.tsExpireCache > 3000) {
          changed = true;
        }
        continue;
      }
      if (findToken && findToken[propName] !== _token[propName]) {
        changed = true;
      }
    }
    const stkn: GraphQLStatusCodes = 'stkn';

    const msg: ITokenMessage = {
      fkUserId: _token.fkUserId,
      ipAddr: _token.ipAddr,
      purpose: _token.purpose || stkn,
      revokeReason: null,
      templateName: _token.templateName,
      tokenId: _token.tokenId,
      tsExpire: _token.tsExpire,
      tsExpireCache: changed ? _token.tsExpire : _token.tsExpireCache,
      tsIssuance: _token.tsIssuance,
      tsRevoked: null
    };

    if (changed) {
      logger.info('%s, token will be saved to adaptor', msg.tokenId);

      return this.adaptor.tokenInsertModify(msg);
    }
    logger.trace('token has not changed');
    //
    // Convert TokenMessage to TokenMessageReturned
    //
    const template = this.templateMaps.get({
      templateName: _token.templateName || ''
    }).first;
    const templateId = (template && template.id) || null;
    const msgCopy = { ...(msg) };
    delete msgCopy.templateName;
    const tokenMsgReply: ITokenMessageReturned = <ITokenMessageReturned> (msgCopy as any);
    tokenMsgReply.templateId = templateId;

    return Promise.resolve(tokenMsgReply);
  }

  private mapTokenToSession(token: ITokenProperties): Express.SessionData {

    const defaultCookie: GraphQLStatusCodes = 'default_cookie';

    const template = this.templateMaps.get({
      templateName: token.templateName || defaultCookie
    }).first;
    if (!template) {
      const errStr = util.format(
        'No cookie template found with name: %s',
        token.templateName || <GraphQLStatusCodes> 'default_cookie'
      );
      logger.error(errStr);
      throw new Error(errStr);
    }
    const _hermes: ITokenProperties = {
      fkUserId: token.fkUserId,
      ipAddr: token.ipAddr,
      purpose: token.purpose,
      revokeReason: token.revokeReason,
      sessionProps: deepClone(token.sessionProps),
      templateName: token.templateName,
      tokenId: token.tokenId,
      tsExpire: token.tsExpire,
      tsExpireCache: token.tsExpireCache,
      tsIssuance: token.tsIssuance,
      tsRevoked: token.tsRevoked
    };

    const _user =
      this.userMaps.get({ userId: token.fkUserId || -1 }).first ||
      this.getAnonymousUser();

    const sess: Express.SessionData = {
      _hermes,
      _user,
      cookie: {
        domain: <string> template.domain,
        expires: new Date(token.tsExpire),
        httpOnly: <boolean> template.httpOnly,
        maxAge: <number> template.maxAge,
        originalMaxAge: <number> template.maxAge,
        path: <string> template.path,
        secure: <boolean> template.secure
      },
      id: token.tokenId

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
          value = `${value}`;
          break;
        case 'object':
          if (value === null) {
            // Yes, null gives 'object' too
            break;
          }
          value = JSON.stringify(value);
          break;
        default:
          value = undefined;
          break;
      }

      if (value === undefined) {
        continue;
      }

      collector[propName] = value;
    }

    return collector;
  }

  private mapSessionToUser(sess: Express.Session | Express.SessionData): IUserProperties {
    const user: IUserProperties | undefined = sess['_user'];

    if (user === undefined) {
      // No user information, set it to anonymous
      return this.getAnonymousUser();
    }
    //
    const rc: IUserProperties = {
      ...user,
      userProps: deepClone(user.userProps || {})
    };

    // Collect props
    for (const propName in user.userProps) {
      let value: any = user.userProps[propName];
      switch (typeof value) { // Need to check can be modified by module consumer.
        case 'string':
          break;
        case 'number':
          value = `${value}`;
          break;
        case 'object': // Null value will get you here
          if (value !== null) {
            value = JSON.stringify(value);
          }
          break;
        default:
          value = undefined as any;
          break;
      }
      if (value === undefined || value === null) {
        continue;
      } else {
        rc.userProps[propName] = value;
      }
    }

    return rc;
  }

  private mapSessionToToken(sess: Express.Session | Express.SessionData): ITokenProperties {
    // What we need is set the expire datum
    // TODO: re populate the session_properties and user properties map
    const _hermes = sess['_hermes'] || {};

    // Correct for missing user, set to anonymous
    if (sess['_hermes'] && !_hermes.fkUserId) {
      // Not set? (should never happen) map to "anonymous"
      throw new HermesStoreError(
        '_hermes object exist but has no fkUserId',
        this.connected
      );
    }

    const token: ITokenProperties = {
      fkUserId: _hermes && _hermes['fkUserId'],
      ipAddr: (sess.req && sess.req.ip) || _hermes['ipAddr'],

      purpose: <GraphQLStatusCodes> 'stkn',
      revokeReason: (_hermes && _hermes['revokeReason']) || null,
      sessionProps: this.stripSessionProps(sess),
      templateName:
      (_hermes && _hermes['templateName']) || this.defaultTemplate,
      tokenId: sess['id'],
      tsExpire: sess.cookie.expires.valueOf() as number,
      tsExpireCache:
        (_hermes && _hermes['tsExpireCache']) ||
        (sess.cookie.expires.valueOf() as number),
      tsIssuance: (_hermes && _hermes['tsIssuance']) || Date.now(),
      tsRevoked: (_hermes && _hermes['tsRevoked']) || null

    };

    logger.debug(
      'session: %s, expire: %d sec',
      token.tokenId,
      Math.round((token.tsExpire - Date.now()) / 3600)
    );
    logger.debug(
      'session: %s, template: %s',
      token.tokenId,
      token.templateName
    );
    logger.trace(
      'session: %s, sessionProps: %j',
      token.tokenId,
      token.sessionProps
    );

    return token;
  }

  private getSession(sessionId: string): Express.SessionData | undefined {
    const token = this.tokenMaps.get({ tokenId: sessionId }).first;

    if (token === undefined) {
      return undefined;
    }

    /* not solved in the store
        if (token.revokeReason) {
            logger.debug('token "%s" was revoked:', sessionId);
            return;
        }*/

    if (token.tsExpire <= new Date().getTime()) {
      logger.debug('token "%s" expired ,token %j', sessionId, token);

      return undefined;
    }
    const stkn: GraphQLStatusCodes = 'stkn';
    if (token.purpose !== stkn) {
      logger.error(
        'INTERNAL INCONSISTANCY: token "%s" is NOT a cookie but appears in a cookie header',
        sessionId
      );

      return undefined;
    }

    return this.mapTokenToSession(token);
  }

  /* users */
  /* users */
  /* users */

  private async userPropertiesUpdateInsert(
    user: IUserProperties
  ): Promise <IUserPropertiesModifyMessageReturned[]> {
    const oldUser = this.userMaps.get({ userId: user.userId }).first;
    const oldProps = (oldUser && oldUser.userProps) || {}; // Empty
    const newProps = user.userProps || {};
    const actions: IPropertiesModifyMessage[] = [];

    if (user.userName === <GraphQLStatusCodes> 'anonymous') {
      return Promise.resolve([] as IUserPropertiesModifyMessageReturned[]);
    }

    // What to add/modify
    for (const props in newProps) {
      if (oldProps[props] !== newProps[props]) {
        logger.trace(
          "User (email) %s, property ['%s'] has changed",
          user.userEmail,
          props
        );
        actions.push({
          invisible: false,
          propName: props,
          propValue: newProps[props]
        });
      }
    }

    const listOfNewProps = Object.keys(newProps);

    const deletes = Object.keys(oldProps)
      .filter(propName => listOfNewProps.indexOf(propName) === -1)
      .map(propNameFiltered => {
        logger.trace(
          'User:%s, property %s marked for deletion',
          user.userName,
          propNameFiltered,
          user.userName
        );
        const rc: IPropertiesModifyMessage = {
          invisible: true,
          propName: propNameFiltered,
          propValue: oldProps[propNameFiltered]
        };

        return rc;
      });

    actions.push.apply(actions, deletes);

    return this.adaptor.userInsertModifyProperty(user.userId, actions);
  }

  private async userFetchOrInsertNew(
    user: IUserProperties
  ): Promise <IUserMessageReturned> {
    const userAnon = this.getAnonymousUser();

    user.userId = user.userId || userAnon.userId;
    user.userName = user.userName || userAnon.userName;
    if (
      user.userId === userAnon.userId ||
      user.userName === userAnon.userName
    ) {
      return Promise.resolve(<IUserMessageReturned> userAnon);
    }

    // At this point its not an anonymous user, we could have partial information to identify user
    let findUser = this.getUserById(user.userId);
    if (!findUser) {
      findUser = this.getUserByName(user.userName);
      if (!findUser) {
        findUser = this.userMaps.get({ userEmail: user.userEmail }).first;
      }
    }

    if (findUser) {
      // Correct possible mess and resolve
      logger.debug('user found in store-cache:%s', user.userName);
      user.userId = findUser.userId;
      user.userName = findUser.userName;
      user.userEmail = findUser.userEmail;
      const reply: IUserMessageReturned = deepClone(user);

      return Promise.resolve(reply);
    }

    // At this point a new user will be created and inserted into the db
    const msg: IUserMessageBase = {
      userEmail: user.userEmail,
      userName: user.userName
    };
    logger.trace('New user, insert into DB %j', msg);

    return this.adaptor.userInsert(msg);
  }


  private init() {
        const self = this;

        function all(callback: CallBack<ISessionHash>): void {

          const allSessions = self.tokenMaps
            .values()
            .filter(token => token.purpose === <GraphQLStatusCodes> 'stkn')
            .map(token => self.getSession(token.tokenId)).filter(f => f !== undefined);

          // We have all sessions as an object key value pair
          const rc: ISessionHash = {};
          allSessions.reduce(
            (hash, sess: Express.SessionData) => {
              const key: string | undefined = sess['id'];
              if (key !== undefined) {
                  hash[key] = sess;
              }

              return hash;
            },
            rc);

          if (callback) defer(callback, null, rc);
        }

        function fDestroy(sessionId: string, callback: CallBack<void>): void {

          logger.debug('destroy session:%s', sessionId);
         // Ge the token
          const token = self.getTokenById(sessionId);
          if (token) {
           const tc = token; // Typescript typeguard above only goes so many levels of nesting
           token.tsRevoked = Date.now();
           token.revokeReason = 'destruction';
           self.tokenUpdateInsert(token)
             .then(() => undefined)
             .catch(err => err) // Dud
             .then(err => {
               self.tokenMaps.set(tc);
               if (callback) defer(callback, err);
             })
             .catch(e => e);
          }
        }

        function fClear(callback: CallBack<void>) {
          self.tokenMaps.clear();
          self.userMaps.clear();
          self.templateMaps.clear();
          if (callback) defer(callback);
       }

        function get(sessionId: string, callback: CallBack<Express.Session>) {
         logger.debug('get session by sessionId: %s', sessionId);
         defer(callback, null, self.getSession(sessionId));
        }

        function set(
          sessionId: string,
          session: Express.Session,
          callback: CallBack<Express.Session>
        ) {

          logger.debug('sessionId: %s', sessionId);

          // Token
          const token = self.mapSessionToToken(session); // Actual goes here
          const oldToken = self.getTokenById(token.tokenId) || { sessionProps: {} };

          const updatedToken: ITokenProperties = <any> {};
          // User
          let user = self.mapSessionToUser(session);

          let updatedUser: IUserProperties;
          //

          self.userFetchOrInsertNew(user)
            .then(async function afterUserInsert(reply) {
              logger.trace(
                'session: %s, user [%s] association.',
                sessionId,
                reply.userName
              );
              // Different id's?
              user = {
                ...reply,
                userProps: { ...user.userProps }
              };
              // Console.log('user:', user);
              const findUser = self.getUserById(reply.userId) || { userProps: {} };
              // Partially change user and update to cache
              updatedUser = {
                ...reply,
                userProps: { ...findUser.userProps }
              };
              self.userMaps.set(updatedUser);

              return self.userPropertiesUpdateInsert(user); // Will use updatedUser in cache to create mutation records for properties
            })
            .then(async function afterUserPropertiesInsert(reply) {
              logger.debug(
                'user %s had %d property-mutations',
                updatedUser.userName,
                reply.length
              );
              const userProps = updatedUser.userProps;
              for (const msg of reply) {
                if (msg.invisible) {
                  delete userProps[msg.propName];
                  continue;
                }
                userProps[msg.propName] = msg.propValue;
              }
              self.userMaps.set(updatedUser);
              token.fkUserId = updatedUser.userId; // Associate

              return self.tokenUpdateInsert(token);
            })
            .then(async function afterTokenUpdateInsert(reply) {
              logger.debug('%s: token updated', sessionId);
              //
              // Convert from template_id to template_name
              const template = self.getTemplateById(reply.templateId || -1);

              delete reply.templateId;
              Object.assign(token, reply); // Update token with returned values

              copyProperties<ITokenProperties, ITokenMessageReturned>(updatedToken, reply);
              updatedToken.templateName = template && template.templateName || null;
              updatedToken.sessionProps = oldToken.sessionProps;

              self.tokenMaps.set(updatedToken);

              return self.tokenPropertiesUpdateInsert(token);
            })
            .then(async function afterTokenPropertiesUpdateInsert(
              /*
                ^^^We use  function name so it shows up on debugging/tracing.
              */
              replyTokenPropertyMessages: ITokenPropertiesModifyMessageReturned[]
            ): Promise<boolean> {

              logger.debug('%s: sessionProps updated', sessionId);

              const sessionProps: { [index: string]: string; } = updatedToken.sessionProps;
              for (const msg of replyTokenPropertyMessages) {
                if (msg.invisible) {
                  delete sessionProps[msg.propName];
                  continue;
                }
                sessionProps[msg.propName] = msg.propValue;
              }
              self.tokenMaps.set(updatedToken);
              // Process change in user properties and user name

              return Promise.resolve(true);
            })
            .then(function final(): void {
              logger.debug('finalize session %s', token.tokenId);
              // This only happens if the sessionId is newly created
              if (!session._hermes || !session._user) {
                logger.trace('monkey patching session %s', token.tokenId);
                const sess: Express.SessionData = self.mapTokenToSession(updatedToken);
                logger.info('session:%s, newly created: %j', token.tokenId, sess);
                session._hermes = session._hermes || sess._hermes;
                session._user = session._user || sess._user;
              }
              if (callback) defer(callback);
            })
            .catch((err: any) => {
              logger.error('there was an error: %j', err);
              if (callback) defer(callback, err);
            });
        }

        function length(callback: CallBack<number>): void {
          const len  = self.tokenMaps.length();
          logger.debug('"length" function called', len);
          callback(null, len);
        }


        function clear(callback: CallBack<void>) {
          self.tokenMaps.clear();
          self.userMaps.clear();
          self.templateMaps.clear();
          if (callback) defer(callback);
        }


        self.all = all.bind(self);
        self.destroy = fDestroy.bind(self);
        self.clear = fClear.bind(self);
        self.get = get.bind(self);
        self.set = set.bind(self);
        self.length = length.bind(self);
        self.clear = clear.bind(self);


    }
}

