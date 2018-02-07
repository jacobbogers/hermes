//import Promise from 'bluebird';
//import { Promise as bbPromise } from 'bluebird';
import * as debug from 'debug';
import { filter, forEach, map, merge, pick, union } from 'lodash';
import * as  moment from 'moment';
import * as UID from 'uid-safe';

import { index, undefinedToNull } from '../../utils';
import { AdapterBase } from '../AdapterBase';
import { AdapterError } from '../AdapterError';
import { ADAPTER_STATE } from '../state';

const fixture = require('./fixture.json');

import {
  Template,
  Token,
  TokenProp,
  User,
  UserProp
} from '../types';

const printer = debug('AdapterMock');

export class AdapterMock extends AdapterBase {

  private user = index<User>(
    ['id'],
    ['email'],
    ['name']); //MapWithIndexes<User, any, any, any, any>;
  private userProp = index<UserProp>(
    ['userId', 'propName'],
    ['propName', 'userId']);

  private token = index<Token>(
    ['id'],
    ['userId', 'id']);
  private tokenProp = index<TokenProp>(
    ['tokenId', 'propName'],
    ['propName', 'tokenId']);
  private template = index<Template>(
    ['name']
  );

  public adaptorName() {
    return 'AdapterMock';
  }

  public constructor() {
    super();
  }

  public dumpDB(): string {
    const allTemplates = this.template.values();
    const allTokens = this.token.values();
    const allTokenProps = this.tokenProp.values();
    const allUsers = this.user.values();
    const allUserProps = this.userProp.values();

    const json = {
      template: allTemplates,
      token: allTokens,
      tokenProp: allTokenProps,
      user: allUsers,
      userProp: allUserProps
    };

    return JSON.stringify(json, null, 4);

  }


  public async shutDown() {
    if (!this.inError && !this.isConnected){
      return;
    }
    try {
      this.setState(ADAPTER_STATE.Disconnected);
      this.user.clear();
      this.userProp.clear();
      this.tokenProp.clear();
      this.token.clear();
      this.template.clear();
    }
    finally {
      this.emit('disconnected');
    }
    return;
  }

  public async init() {
    if (this.isConnected){
      return;
    }
    try {
      await this.populateMaps();
      this.setState(ADAPTER_STATE.Connected);
      this.emit('connected');
    }
    catch (e) {
      await this.shutDown();
    }
  }

  /* user */
  public async userUpsert(user: User) {

    if (!this.isConnected) {
      throw new AdapterError('Adaptor is not connected:', this.state);
    }

    const u = { ...user }; //copy
    undefinedToNull(u);
    printer('Inserting user %o', u);

    // Username is unique
    let conflict = this.user.get({ name: u.name }).first;
    if (conflict) {
      throw new AdapterError(
        `unique key violation, userName:[${u.name}] already exist`,
        this.state
      );
    }
    // Email is unique
    conflict = this.user.get({ email: u.email }).first;
    if (conflict) {
      throw new AdapterError(
        `unique key violation, [userEmail:${u.email}] already exist`,
        this.state
      );
    }
    printer('creating new user...%s', user.name);

    u.id = UID.sync(32);
    let rc = this.user.set(u).first;
    printer('success: "creating user", %o', rc);
    return rc;
  }

  public async userPropertyUpsert(
    modifications: UserProp[]
  ) {
    if (!this.isConnected) {
      throw new AdapterError('Adaptor is not connected:', this.state);
    }

    if (!modifications.length) {
      printer('No userProp to modify, called with empty list');
      return []; // nothing to change
    }

    const created = moment().toISOString();

    const updated = map(modifications, (v, i) => {
      const found = this.userProp.get({ userId: v.userId, propName: v.propName }).first;

      if (found) {
        merge(found, pick(v, ['invisible', 'propValue']), { lastUpdated: moment().toISOString() });
        this.userProp.set(found); //TODO: bluebird
        return found;
      }
      //new
      v.created = created;
      v.lastUpdated = moment().toISOString();
      this.userProp.set(v); // TODO: use bluebird
      return v;
    });

    forEach(updated, mod => {
      const { propName: name, userId: id } = mod;
      if (mod.created === 'NOW') {
        printer('user:[%s] Prop: [%s] inserted', id, name);
        return;
      }
      if (mod.invisible) {
        printer('user:[%s] Prop: [%s] invisible', id, name);
        return;
      }
      printer('user:[%s] Prop: [%s] updated', id, name);
    });

    return updated;
  }

  public async tokenAssociateWithUser(
    tokenId: string,
    userId: string
  ) {

    printer('assoiate token %s with user %s', tokenId, userId);

    if (!this.isConnected) {
      throw new AdapterError('Adaptor is in the wrong state:', this.state);
    }

    const t = this.token.get({ id: tokenId }).first;
    if (t) {
      const u = this.user.get({ id: userId }).first;
      if (!u) {
        throw new AdapterError(`User with Id: ${userId} doesnt exist!`, this.state);
      }
      t.userId = u.id;
      this.token.set(t);
    }
    return;
  }

  public async templateSelectAll() {
    if (!this.isConnected) {
      throw new AdapterError('Adaptor is not connected', this.state);
    }
    return this.template.values();
  }

  // we expect tokens to have a lot of retired id's
  public async tokenGC(deleteOlderThen: string) {
    if (!this.isConnected) {
      throw new AdapterError('Adaptor is in the wrong state:', this.state);
    }

    const toDelete = await this.token.values().filter(
      token => token.revoked && token.revoked < deleteOlderThen
    );
    //TODO:use bluebord
    toDelete.forEach(token => this.token.delete(token));

    return toDelete.length;
  }

  public async tokenUpsert(token: Token) {

    if (!this.isConnected) {
      throw new AdapterError('Adaptor is not connected:', this.state);
    }
    token.template = token.template || 'hermes';
    token.userId = token.userId || '0000-0000-0000-0000';
    token.created = token.created || moment().toISOString();
    token.lastUpdated = token.lastUpdated || moment().toISOString();

    //check 1
    let template: boolean | Template | undefined = true;
    let user: boolean | User | undefined = true;

    if (token.userId !== '0000-0000-0000-0000') {
      user = this.user.get({ id: token.userId }).first;
    }
    if (token.template !== 'hermes') {
      template = this.template.get({ name: token.template }).first;
    }

    // parallel wait))
    await !!(user) && !!(template);

    if (!template) {
      throw new AdapterError(
        `could not find for token, the template: [${token.template}]`,
        this.state
      );
    }

    if (!user) {
      throw new AdapterError(
        `could not find (non-anonymous) user for this token, not even anonymous: [${token.userId}]`,
        this.state
      );
    }
    //clear sailing

    await this.token.set(token);
    // Return value is the same less for sessionprops stripped off
    printer('success: "created/updated token": %o', token);

    return token;
  }

  public async revokeToken(
    id: string,
    ipAddr: string,
    revokeReason: string
  ) {
    if (!this.isConnected) {
      throw new AdapterError('Adaptor is not connected:', this.state);
    }
    const t = this.token.get({ id }).first;
    if (!t) {
      return; // nothing to do
    }

    t.revoked = moment().toISOString();
    t.revokeReason = revokeReason;
    t.ip = ipAddr; // revoked from this "ip"

    await this.token.set(t);
    return t;
  }

  public async tokenSelectAllByUser({ id, name, email }:
    { id?: string, name?: string, email?: string }) {
    if (!this.isConnected) {
      throw new AdapterError('Adaptor is not connected', this.state);
    }
    let cnt = map({ id, name, email }, (v, k) => v && k).length;

    if (cnt !== 1) {
      throw new AdapterError('Specifiy only one of `id`, `name` and `email` props', this.state);
    }

    let nId;

    switch (true) {
      case (!!name):
        {
          let _user = await this.user.get({ name }).first;
          if (!_user) {
            return [];
          }
          nId = _user.id;
        }
        break;
      case (!!email):
        {
          let _user = await this.user.get({ email }).first;
          if (!_user) {
            return [];
          }
          nId = _user.id;
        }
        break;
      default:
        nId = id;
    }

    const result = await this.token.get({ userId: nId }).collected;
    return result || [];
  }


  public async tokenPropertyUpsert(
    modifications: TokenProp[]
  ) {
    if (!this.isConnected) {
      throw new AdapterError('Adaptor is in the wrong state:', this.state);
    }

    if (!modifications.length) {
      return [];
    }
    const created = moment().toISOString();

    const updated = map(modifications, (v, i) => {
      const found = this.tokenProp.get({ tokenId: v.tokenId, propName: v.propName }).first;
      if (found) {
        merge(found, pick(v, ['invisible', 'propValue']), { lastUpdated: 'NOW' });
        this.tokenProp.set(found); //TODO: bluebird
        return found;
      }
      //new
      v.created = created;
      v.lastUpdated = moment().toISOString();
      this.tokenProp.set(v); // TODO: use bluebird
      return v;
    });

    forEach(updated, mod => {
      const { propName: name, tokenId: id } = mod;
      if (mod.created === 'NOW') {
        printer('token:[%s] Prop: [%s] inserted', id, name);
        return;
      }
      if (mod.invisible) {
        printer('token:[%s] Prop: [%s] invisible', id, name);
        return;
      }
      printer('token:[%s] Prop: [%s] updated', id, name);
    });

    return updated;
  }

  public async tokenSelectAll(includeInValid?: boolean) {
    if (!this.isConnected) {
      throw new AdapterError('Adaptor is in the wrong state:', this.state);
    }
    const found = await this.token.values();
    const now = moment().toISOString();

    //bluebird maybe
    return filter(found, t => {
      if (includeInValid) {
        return true; // return everything 
      }
      return (t.expire > now) && !!t.revoked;
    });
  }

  public async userSelectByFilter(p: { tokenUpdatedAfter: string, includeBanned: boolean }) {
    //for now brute force approach
    const bannedProps: UserProp[] | boolean | undefined
      = p.includeBanned && this.userProp.get({ propName: 'BANNED' }).collected;

    const allTokens = this.token.values();

    await !!(bannedProps) && !!(allTokens);

    const usersUpdatedAfter =
      map(filter(allTokens, t => t.lastUpdated >= p.tokenUpdatedAfter), t => t.userId);

    const usersBanned = map(bannedProps as any, (b: any) => b.userId);

    //WHERE.LASTUPDATEAFTER..OR...BANNED
    const userIds = union(usersUpdatedAfter, usersBanned);

    // TODO: firebird get all users
    return filter(map(userIds, id => this.user.get({ id }).first), f => f) as any;
  }


  private async populateMaps() {
    // fixture
    // use firebird!!
    forEach(fixture['template'], (template) => {
      this.template.set(template, true);
    });

    forEach(fixture['user'], (user) => {
      this.user.set(user, user.name === 'anonymous');
    });

    forEach(fixture['userprop'], (userP) => {
      this.userProp.set(userP);
    });

    forEach(fixture['token'], (token) => {
      this.token.set(token);
    });

    forEach(fixture['tokenProp'], (tokenP) => {
      this.token.set(tokenP);
    });
  }
}
