// tslint:disable:typedef

import * as util from 'util';

import { Logger } from '~lib/logger';
const logger = Logger.getLogger();

import * as UID from 'uid-safe';
import { GraphQLStatusCodes } from '~graphql/GraphQLStatusCodes';
import { makeObjectNull, MapWithIndexes } from '~lib/utils';

// State
import { ADAPTOR_STATE } from '~states/adaptor_state';

import { AdaptorBase } from '~adaptors/AdaptorBase';
import { AdaptorError } from '~adaptors/AdaptorError';

// Properties

import { IPropertiesModifyMessage } from '~properties/IPropertiesModifyMessage';

// Tokens
import {
  // ,
  ITokenMessage,
  ITokenMessageReturned,
  ITokenPropertiesModifyMessageReturned,
  ITokensAndPropsMessage
} from '~tokens';

// Users

import {
  IUserMessageBase,
  IUserMessageReturned,
  IUserPropertiesModifyMessageReturned,
  IUsersAndPropsMessage
} from '~users';

// Templates
import { ITemplatePropsMessage } from '~templates';

import {
  ITemplateProperties,
  ITokenProperties,
  IUserProperties
} from '~hermes-props';


export class AdaptorMock extends AdaptorBase {
  private static userPk = 333;

  private user: MapWithIndexes<IUserProperties, any, any, any, any>;
  private token: MapWithIndexes<ITokenProperties, any, any, any, any>;
  private template: MapWithIndexes<ITemplateProperties, any, any, any, any>;

  public constructor() {
    super();
    this.user = new MapWithIndexes<IUserProperties, any, any, any, any>(
      ['userId'],
      ['userName'],
      ['userEmail']
    );
    // Composite))
    this.token = new MapWithIndexes<ITokenProperties, any, any, any, any>(
      ['tokenId'],
      ['fkUserId', 'purpose', 'tokenId']
    );
    this.template = new MapWithIndexes<ITemplateProperties, any, any, any, any>(
      ['id'],
      ['templateName']
    );
  }

  public shutDown(): Promise<boolean> {
    return super
      .destroy()
      .then(() => {
        this.transition(ADAPTOR_STATE.Disconnected, true);

        return true;
      })
      .catch(() => false)
      .then((rc: boolean) => {
        this.emit('diconnect');

        return rc;
      });
  }

  public init(): Promise<boolean> {
    if (!this.transition(ADAPTOR_STATE.Initializing)) {
      this.addErr(
        'State cannot transition to [%s] from [%s]',
        ADAPTOR_STATE[ADAPTOR_STATE.Initializing],
        ADAPTOR_STATE[this.state]
      );
      logger.error(this.lastErr());

      return Promise.reject(false);
    }

    this.populateMaps();

    if (!this.transition(ADAPTOR_STATE.Initialized)) {
      this.addErr('Could not transition to [Initialized] state');
      this.transition(ADAPTOR_STATE.ERR_Initializing, true);
      logger.error(this.lastErr());

      return this.destroy(true);
    }
    logger.info('success loading all test data files');

    return Promise.resolve(true);
  }

  public get poolSize(): number {
    return 99; // Dummy
  }

  public get connected(): boolean {
    return this.state === ADAPTOR_STATE.Initialized;
  }

  /* user */
  public userInsert(user: IUserMessageBase): Promise<IUserMessageReturned> {
    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }

    const u = { ...user };
    makeObjectNull(u);

    logger.trace('Inserting user %j', u);

    return new Promise<IUserMessageReturned>((resolve, reject) => {
      // Username is unique
      let conflict = this.user.get({ userName: u.userName }).first;
      if (conflict) {
        return reject(
          new AdaptorError(
            util.format(
              'unique key violation, [userName] already exist: %s',
              u.userName
            ),
            this.state
          )
        );
      }
      // Email is unique
      conflict = this.user.get({ userEmail: u.userEmail }).first;
      if (conflict) {
        return reject(
          new AdaptorError(
            util.format(
              'unique key violation, [userEmail] already exist: %s',
              u.userName
            ),
            this.state
          )
        );
      }
      console.info('creating new user...');
      const msg: IUserMessageReturned = {
        userEmail: user.userEmail,
        userName: user.userName,
        userId: this.newUserPk()
      };
      const newUser: IUserProperties = {
        ...msg,
        userProps: {}
      };
      this.user.set(newUser);
      logger.info('success: "creating user", returned values %j', msg);
      delete newUser.userProps;

      return resolve(msg);
    });
  }

  public userInsertModifyProperty(
    userId: number,
    modifications: IPropertiesModifyMessage[]
  ): Promise<IUserPropertiesModifyMessageReturned[]> {
    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }

    logger.trace('user  %s props modification list %j', userId, modifications);

    // Check 1 user must exist
    return new Promise<
      IUserPropertiesModifyMessageReturned[]
    >((resolve, reject) => {
      const uc = this.user.get({ userId }).first;
      if (!uc) {
        return reject(
          new AdaptorError(
            util.format(
              'foreign key violation, [userId] does not exist: %d',
              userId
            ),
            this.state
          )
        );
      }
      const rc: IUserPropertiesModifyMessageReturned[] = [];

      for (const mod of modifications) {
        // Switch is just for logging/tracing
        switch (true) {
          case mod.invisible:
            logger.trace(
              'user:%d, DELETE property %s',
              uc.userId,
              mod.propName
            );
            break;
          case !(mod.propName in uc.userProps):
            logger.trace(
              'user:%d, NEW property %s, value %s',
              uc.userId,
              mod.propName,
              mod.propValue
            );
            break;
          case uc.userProps[mod.propName] !== mod.propValue:
            logger.trace(
              'user:%d, MODIFY property %s, NEW value: %s, OLD value: %s',
              uc.userId,
              mod.propName,
              mod.propValue,
              uc.userProps[mod.propName]
            );
            break;
          default:
            break;
        }
        rc.push({
          fkUserId: uc.userId,
          propName: mod.propName,
          propValue: mod.propValue,
          invisible: mod.invisible
        });
        if (mod.invisible) {
          delete uc.userProps[mod.propName];
          continue;
        }
        uc.userProps[mod.propName] = mod.propValue;
      }

      return resolve(rc);
    });
  }

  public userSelectByFilter(): Promise<IUsersAndPropsMessage[]> {
    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }

    return new Promise<IUsersAndPropsMessage[]>(resolve => {
      // Flatten users and props
      const rc: IUsersAndPropsMessage[] = [];
      this.user.values().reduce((prev, user) => {
        const propKeys = Object.getOwnPropertyNames(user.userProps);
        do {
          const pKey = propKeys.pop();
          const pValue = pKey && user.userProps[pKey];
          prev.push({
            userId: user.userId,
            userName: user.userName,
            userEmail: user.userEmail,
            propName: pKey || '',
            propValue: pValue || ''
          });
        } while (propKeys.length);

        return prev;
      },                        rc);

      logger.trace('[selectUserProps]success: rows fetched %d', rc.length);
      resolve(rc);
    });
  }

  /*tokens*/
  /*tokens*/
  /*tokens*/

  public tokenInsertRevoke(
    fkUserId: number,
    purpose: string,
    ipAddr: string
  ): Promise<ITokenMessageReturned> {
    logger.trace(
      'insert new token type [%s] and expire older ones for user %d',
      purpose,
      fkUserId
    );

    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }
    /*
    1 token id,
    2 fk_user_id,
    3 ip,
    4 issuance/rovoke timestamp,
    5 purpose
    */
    const u = this.user.get({ userId: fkUserId }).first;
    if (!u) {
      return Promise.reject(
        new AdaptorError(`User with id ${fkUserId} doesn't exist`, this.state)
      );
    }
    // Get all tokens from this user
    const collected = this.token.get({ fkUserId, purpose }).collected;
    let nrRevoked = 0;
    if (collected) {
      for (const token of collected) {
        if (token.revokeReason !== null) {
          continue;
        }
        token.revokeReason = 'RE';
        token.tsRevoked = Date.now();
        this.token.set(token);
        nrRevoked++;
      }
    }

    const tsExpire = new Date().setFullYear(9999);
    const tokenId = UID.sync(18);
    const nt: ITokenProperties = {
      tokenId,
      fkUserId,
      purpose,
      ipAddr,
      tsIssuance: Date.now(),
      tsRevoked: null,
      revokeReason: null,
      tsExpire, // Never expire
      tsExpireCache: tsExpire,
      sessionProps: {},
      templateName: 'default_token'
    };
    this.token.set(nt);
    logger.trace(
      'success: new token %s inserted, %d expired',
      tokenId,
      nrRevoked
    );
    const rc: ITokenMessageReturned = {
      templateId: 0,
      tokenId: nt.tokenId,
      fkUserId: nt.fkUserId,
      purpose: nt.purpose,
      ipAddr: nt.ipAddr,
      tsIssuance: nt.tsIssuance,
      tsRevoked: null,
      revokeReason: null,
      tsExpire: nt.tsExpire,
      tsExpireCache: nt.tsExpire
    };

    return Promise.resolve(rc);
  }

  public tokenInsertModify(token: ITokenMessage):
    Promise<ITokenMessageReturned> {

    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }
    /* Update all except the sessionProps this will
    be done in another call 'tokenInsertModifyProperty'
    */
    const findToken = this.token.get({ tokenId: token.tokenId }).first;
    const oldSessionProps = { sessionProps: {}, ...findToken }.sessionProps;
    const t = { ...token, sessionProps: oldSessionProps };
    makeObjectNull(t);

    const self = this;

    return new Promise<ITokenMessageReturned>(function asyncTokenInsertModify(
      resolve,
      reject
    ) {
      // Determine template
      t.templateName = token.templateName || 'default_token';
      // Is it is defaulted in the sql query

      const template = self.template.get({
        templateName: t.templateName
      }).first;

      if (template === undefined) {
        return reject(
          new AdaptorError(
            util.format('could not find template [%s]', t.templateName),
            self.state
          )
        );
      }
      // Create-update tokenProperties
      self.token.set(t); // A copy is saved!! not a reference to 't'
      // Return value is the same less for sessionprops stripped off
      logger.debug('success: "created/updated token": %j', t);

      return resolve({
        tokenId: t.tokenId,
        fkUserId: t.fkUserId,
        purpose: t.purpose,
        ipAddr: t.ipAddr,
        tsIssuance: t.tsIssuance,
        tsRevoked: t.tsRevoked,
        revokeReason: t.revokeReason,
        tsExpire: t.tsExpire,
        tsExpireCache: t.tsExpire,
        templateId: template.id
      });
    });
  }

  public tokenInsertModifyProperty(
    tokenId: string,
    modifications: IPropertiesModifyMessage[]
  ): Promise<ITokenPropertiesModifyMessageReturned[]> {
    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }
    logger.trace(
      'token  %s props modification list %j',
      tokenId,
      modifications
    );

    return new Promise<
      ITokenPropertiesModifyMessageReturned[]
    >((resolve, reject) => {
      // Check 1 user must exist
      const t = this.token.get({ tokenId }).first;
      if (!t) {
        return reject(
          new AdaptorError(
            util.format(
              'foreign key violation, [tokenId] does not exist: %d',
              tokenId
            ),
            this.state
          )
        );
      }
      const rc: ITokenPropertiesModifyMessageReturned[] = [];
      const tc = t;

      for (const mod of modifications) {
        // Switch is just for logging/tracing
        switch (true) {
          case mod.invisible:
            logger.trace(
              'token:%d, DELETE property %s',
              tc.tokenId,
              mod.propName
            );
            break;
          case !(mod.propName in tc.sessionProps):
            logger.trace(
              'token:%d, NEW property %s, value %s',
              tc.tokenId,
              mod.propName,
              mod.propValue
            );
            break;
          case tc.sessionProps[mod.propName] !== mod.propValue:
            logger.trace(
              'token:%d, MODIFY property %s, NEW value: %s, OLD value: %s',
              tc.tokenId,
              mod.propName,
              mod.propValue,
              tc.sessionProps[mod.propName]
            );
            break;
          default:
          break;
        }
        rc.push({
          propName: mod.propName,
          propValue: mod.propValue,
          invisible: mod.invisible,
          fkTokenId: tokenId
        });
        if (mod.invisible) {
          delete tc.sessionProps[mod.propName];
          continue;
        }
        tc.sessionProps[mod.propName] = mod.propValue;
      }

      return resolve(rc);
    });
  }

  public tokenAssociateWithUser(
    tokenId: string,
    userId: number
  ): Promise<boolean> {
    logger.trace('assoiate token %s with user %d', tokenId, userId);

    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }

    const t = this.token.get({ tokenId }).first;
    if (t) {
      const u = this.user.get({ userId }).first;
      if (!u) {
        return Promise.reject(
          new AdaptorError(
            util.format('User with Id: %d doesnt exist!', userId),
            this.state
          )
        );
      }
      t.fkUserId = u.userId;
      this.token.set(t);
    }

    return Promise.resolve(true); //
  }

  public tokenDoRevoke(
    tokenId: string,
    revokeReason: string,
    _revokeTime?: number | null
  ): Promise<boolean> {
    logger.trace('Expire token %s with reason %s', tokenId, revokeReason);

    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }

    const revokeTime = _revokeTime ||  Date.now();

    //
    // Token exist?
    //
    const t = this.token.get({ tokenId }).first;
    if (t) {
      t.revokeReason = revokeReason;
      t.tsRevoked = revokeTime;
      this.token.set(t);
    }

    return Promise.resolve(true);
  }

  public tokenGC(deleteOlderThen: number): Promise<number> {
    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }

    const allTokens = this.token.values();
    const rc = allTokens.filter(
      token => token.tsRevoked && token.tsRevoked < deleteOlderThen
    );
    rc.forEach(token => this.token.delete(token));

    return Promise.resolve(rc.length);
  }

  public tokenSelectAllByFilter(
    timestampExpire: number | null,
    startTimestampRevoked: number,
    endTimestampRevoked: number
  ): Promise<ITokensAndPropsMessage[]> {
    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is in the wrong state:', this.state)
      );
    }

    const result = this.getTokensByFilter(token => {
      let rc = !timestampExpire || token.tsExpire > timestampExpire;
      const tsrevoked = token.tsRevoked || 0;
      rc =
        rc &&
        (tsrevoked >= startTimestampRevoked &&
          tsrevoked <= endTimestampRevoked);

      return rc;
    });

    return Promise.resolve(result);
  }

  public tokenSelectAllByUserIdOrName(
    userId: number | null,
    userName: string | null
  ): Promise<ITokensAndPropsMessage[]> {
    if (!this.connected) {
      return Promise.reject(
        new AdaptorError('Adaptor is not connected', this.state)
      );
    }

    if (
      (userId === null && userName === null) ||
      (userId !== null && userName !== null)
    ) {
      return Promise.reject(
        new AdaptorError(
          'wrong input, userId and userName cannot' +
          ' be both non null or both null.',
          this.state
        )
      );
    }

    const result = this.getTokensByFilter(token => {
      let rc = false;
      if (userId) {
        rc = token.fkUserId === userId;
      }
      if (userName) {
        const u = this.user.get({ userName }).first;
        if (u) {
          rc = token.fkUserId === u.userId;
        }
      }

      return rc;
    });

    return Promise.resolve(result);
  }

  /* templates */
  public templateSelectAll(): Promise<ITemplatePropsMessage[]> {
    if (!this.connected) {
      this.addErr('Adaptor is not connected');

      return Promise.reject(this.lastErr());
    }

    const result = this.template.values().map(temp => {
      const rc: ITemplatePropsMessage = {
        id: temp.id,
        cookieName: temp.cookieName,
        path: temp.path,
        maxAge: temp.maxAge,
        httpOnly: temp.httpOnly,
        secure: temp.secure,
        domain: temp.domain,
        sameSite: temp.sameSite,
        rolling: temp.rolling,
        templateName: temp.templateName
      };

      return rc;
    });

    return Promise.resolve(result);
  }

  private newUserPk(): number {
    do {
      AdaptorMock.userPk++; // Bump
    } while (this.user.get({ userId: AdaptorMock.userPk }).first !== undefined);

    return AdaptorMock.userPk;
  }


  private getTokensByFilter(
    filter: (xyz: ITokenProperties) => boolean
  ): ITokensAndPropsMessage[] {

    const result: ITokensAndPropsMessage[] = [];

    this.token
      .values()
      .filter(filter)
      .reduce((prev, _token) => {
        const u = <IUserProperties> this.user.get({
          userId: <number> _token.fkUserId
        }).first;
        const uPropKeys = Object.getOwnPropertyNames(u.userProps);
        const tPropKeys = Object.getOwnPropertyNames(_token.sessionProps);

        const blacklisted: GraphQLStatusCodes = 'blacklisted';

        const blackListed = uPropKeys.indexOf(blacklisted) >= 0;
        while (uPropKeys.length || tPropKeys.length) {
          const uPropName = uPropKeys.pop();
          const tPropName = tPropKeys.pop();
          prev.push({
            tokenId: _token.tokenId,
            fkUserId: u.userId,
            usrName: u.userName,
            usrEmail: u.userEmail,
            blackListed,
            purpose: _token.purpose,
            ipAddr: _token.ipAddr,
            tsIssuance: _token.tsIssuance,
            tsRevoked: _token.tsRevoked,
            tsExpire: _token.tsExpire,
            tsExpireCache: _token.tsExpire,
            revokeReason: _token.revokeReason,
            templateName: _token.templateName,
            sessionPropName: tPropName || null,
            sessionPropValue:
              (tPropName && _token.sessionProps[tPropName]) || null,
            propName: uPropName || null,
            propValue: (uPropName && u.userProps[uPropName]) || null
          });
        }

        return prev;
      },      result);

    return result;
  }


  private populateMaps() {
    // Users
    const users: IUserProperties[] = [
      {
        userId: 1,
        userName: 'Lucifer696',
        userEmail: 'vdingbats@gmail.com',
        userProps: {}
      },
      {
        userId: 7,
        userName: 'lucifer69c6',
        userEmail: 'vdwingbats@gmail.com',
        userProps: {}
      },
      { userId: 15, userName: 'anonymous', userEmail: '', userProps: {} },
      {
        userId: 18,
        userName: 'lucife696x',
        userEmail: 'change@me.lu',
        userProps: {}
      },
      { userId: 23, userName: 'jacobot', userEmail: 'email', userProps: {} }
    ];

    users.forEach(u => {
      u.userName = u.userName.toLocaleLowerCase();
      u.userEmail = u.userEmail.toLocaleLowerCase();
      this.user.set(u);
    });

    // UserProps
    const userProps = [
      {
        fk_user_id: 23,
        prop_name: 'LAST_NAME',
        prop_value: 'Bovors',
        invisible: false
      },
      {
        fk_user_id: 23,
        prop_name: 'AUTH',
        prop_value: 'admin',
        invisible: false
      },
      {
        fk_user_id: 23,
        prop_name: 'zipcode',
        prop_value: 'L1311',
        invisible: false
      },
      {
        fk_user_id: 1,
        prop_name: 'LAST_NAME',
        prop_value: 'Bovors',
        invisible: false
      },
      {
        fk_user_id: 1,
        prop_name: 'AUTH',
        prop_value: 'admin',
        invisible: false
      },
      {
        fk_user_id: 1,
        prop_name: 'phoneNr',
        prop_value: '+352621630973',
        invisible: true
      },
      {
        fk_user_id: 1,
        prop_name: 'blacklisted',
        prop_value: '',
        invisible: false
      },
      {
        fk_user_id: 1,
        prop_name: 'password',
        prop_value: 'itsme',
        invisible: false
      },
      {
        fk_user_id: 18,
        prop_name: 'password',
        prop_value: 'dingbats',
        invisible: false
      },
      {
        fk_user_id: 23,
        prop_name: 'password',
        prop_value: 'jacobot',
        invisible: false
      }
      /* {
         fk_user_id: 23,
         prop_name: 'no-acl',
         prop_value: 'tokenbladibla:0',
         invisible: false
        }
        */
      /*{
        fk_user_id: 15,
        prop_name: 'await-activation',
        prop_value: 'tokenbladibla:0',
        invisible: false
      }
      */
    ];

    userProps.forEach(up => {
      const u = this.user.get({ userId: up.fk_user_id }).first;
      if (u) {
        up.prop_name = up.prop_name.toLocaleLowerCase();
        u.userProps[up.prop_name] = up.prop_value;
        this.user.set(u);
      }
    });

    const templates = [
      {
        id: 0,
        cookie_name: '',
        path: null,
        max_age: 86400000,
        http_only: null,
        secure: null,
        domain: null,
        same_site: null,
        rolling: null,
        template_name: 'default_token'
      },
      {
        id: 1,
        cookie_name: 'hermes.session',
        path: '/',
        max_age: 10800000,
        http_only: true,
        secure: false,
        domain: null,
        same_site: true,
        rolling: true,
        template_name: 'default_cookie'
      },
      {
        id: 3,
        cookie_name: 'hermes.session',
        path: '/',
        max_age: 10800000,
        http_only: true,
        secure: false,
        domain: null,
        same_site: true,
        rolling: true,
        template_name: 'secure_cookie'
      }
    ];

    templates.forEach(t => {
      this.template.set({
        id: t.id,
        cookieName: t.cookie_name.toLocaleLowerCase(),
        path: t.path,
        maxAge: t.max_age,
        httpOnly: t.http_only,
        secure: t.secure,
        domain: t.domain,
        sameSite: t.same_site,
        rolling: t.rolling,
        templateName: t.template_name.toLocaleLowerCase()
      });
    });
  }
}
