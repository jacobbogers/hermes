'use strict';

// tslint:disable:typedef

// Vendor
import * as pg from 'pg';
import * as UID from 'uid-safe';
import * as URL from 'url';
import * as util from 'util';

// App
import { SystemInfo } from '~system';
import {
    IAnyObjProps,
    ifInvalidPortString,
    ifNull
} from '~utils';


import Logger from '~lib/logger';
const logger = Logger.getLogger();

import { GraphQLStatusCodes } from '~graphql/GraphQLStatusCodes';
import { makeObjectNull, MapWithIndexes } from '~lib/utils';

// State
import { ADAPTOR_STATE } from '~states/adaptor_state';

// Adaptor
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

import {
    IAdaptorPostgreSQLProperties
} from './IAdaptorPostgreSQLProperties';


interface ISQLFiles {
    sqlTokenInsertModifyProperty: string;
    sqlTokenAssociateWithUser: string;
    sqlTokenInsertModify: string;
    sqlInsertRevoke: string;
    sqlTokenGC: string;
    //
    sqlTokenSelectAllByFilter: string;
    //
    sqlTokenSelectByUserIdOrName: string;
    //
    sqlUserGc: string;
    sqlUserInsert: string;
    sqlUserInsertModifyProperty: string;
    sqlUserSelectAll: string;
    //
    sqlTemplateSelectAll: string;
}

type ResolveResult<T> = (res: pg.QueryResult, resolve: (rc: T | undefined) => void) => void;

const sqlFiles: ISQLFiles = {
    sqlTokenInsertModifyProperty: require('./sql/token_insert_modify_property.sql'),
    sqlTokenAssociateWithUser: require('./sql/token_associate_with_user.sql'),
    sqlTokenInsertModify: require('./sql/token_insert_modify.sql'),
    sqlInsertRevoke: require('./sql/token_insert_revoke.sql'),
    sqlTokenGC: require('./sql/token_gc.sql'),
    //
    sqlTokenSelectAllByFilter: require('./sql/token_select_all_by_filter.sql'),
    sqlTokenSelectByUserIdOrName: require('./sql/token_select_by_userid_or_name.sql'),
    //
    sqlUserGc: require('./sql/user_gc.sql'),
    sqlUserInsert: require('./sql/user_insert.sql'),
    sqlUserInsertModifyProperty: require('./sql/user_insert_modify_property.sql'),
    sqlUserSelectAll: require('./sql/user_select_all.sql'),
    //
    sqlTemplateSelectAll: require('./sql/template_select_all.sql')

};

type SqlFileKeys = keyof ISQLFiles;

/*  database adaptor */
/*  database adaptor */
/*  database adaptor */


export class AdaptorPostgreSQL extends AdaptorBase {

    private _url: string;
    private pool: pg.Pool;
    private nrClients: number;
    private accessCount: number;
    private sql: Map<SqlFileKeys, pg.QueryConfig>;

    public constructor(app: IAdaptorPostgreSQLProperties) {
        super();
        this._url = app.url;
    }


    public init(): Promise<boolean> {

        const pURL = this._url;

        if (!this.transition(ADAPTOR_STATE.Initializing)) {
            this.addErr('State cannot transition to [%s] from [%s]', ADAPTOR_STATE[ADAPTOR_STATE.Initializing], ADAPTOR_STATE[this.state]);
            logger.error(this.lastErr());

            return Promise.reject(false);
        }

        const ci = URL.parse(pURL);
        // Collect all errors and warnings
        const _si = SystemInfo.createSystemInfo();
        const errP = _si.addError.bind(_si);
        const warnP = _si.addWarning.bind(_si);


        ifNull(warnP, ci.protocol, 'No protocol specified in: %s', pURL);
        ifNull(errP, ci.auth, 'No authentication specified in: %s', pURL);
        ifNull(errP, ci.hostname, 'No host specified in: %s', pURL);

        ifNull(warnP, ci.port, 'No port specified? set to 5432: %s', pURL);
        ci.port = ci.port || '5432';
        const port = Number.parseInt(ci.port);

        ifInvalidPortString(errP, ci.port, 'The port [%s] is not a valid number [%s]', ci.port, pURL);

        ifNull(errP, ci.pathname && ci.pathname.slice(1), 'No database specified in: %s', pURL);
        ifNull(warnP, ci.query, 'No connection parameters specified in: %s', pURL);

        if (_si.hasErrors(AdaptorError)) {
            this.transition(ADAPTOR_STATE.ERR_Initializing, true);

            return Promise.reject(false);
        }

        const params = ci.query && ci.query.split('&');
        const qry: IAnyObjProps = params.reduce((ac: IAnyObjProps, val: string) => {
            const [key, value] = val.split('=');
            ac[key] = value;

            return ac;
        },                                      {});

        const [user, password] = (ci.auth && ci.auth.toLowerCase().split(':')) as string[];
        const database = ci.pathname && ci.pathname.slice(1);
        const host = ci.hostname;

        const conf: pg.PoolConfig = {
            user,
            password,
            database,
            port,
            host,
            ssl: qry['sslmode'] !== 'disable',
            max: 30, // Set pool max size
            min: 20, // Set min pool size
            idleTimeoutMillis: 1000 * 3600 * 24, // Ms

            refreshIdle: true
        };
        pg.defaults.parseInt8 = true; // Use bigint datatype
        // Create the pool

        logger.info('Creating the Pool at time [%s]', new Date().toTimeString());

        this.nrClients = 0;
        this.accessCount = 0;
        this.pool = new pg.Pool(conf);

        this.pool.on('connect', (/*client: pg.Client*/) => {
            logger.trace('client connected to db [%d]', ++this.nrClients);
        });

        this.pool.on('acquire', (/*client: pg.Client*/) => {
            logger.debug('client acquire to db');
        });
        // Client has an error while sitting idel
        this.pool.on('error', (err: Error) => {
            logger.error('idle client error [%j]', err);
            this.addErr('client error when sitting idle, error [%s] [%s]', err.message, err.stack || '');
            this.nrClients--;
        });

        this.sql = new Map();

        return this.loadSQLStatements()
            .then(() => {
                if (!this.transition(ADAPTOR_STATE.Initialized)) {
                    this.addErr('Could not transition to [Initialized] state');
                    this.transition(ADAPTOR_STATE.ERR_Initializing, true);
                    logger.error(this.lastErr());

                    return this.destroy(true);
                }
                logger.info('success loading all sql files');

                return Promise.resolve(true);
            }).catch(() => {
                this.transition(ADAPTOR_STATE.ERR_Initializing, true);
                logger.error(this.lastErr());

                return this.destroy(true);
            });
    }

    /*general tooling*/
    /*general tooling*/
    /*general tooling*/

    public get poolSize(): number {
        return this.nrClients;
    }

    public get connected(): boolean {
        return this.state === ADAPTOR_STATE.Initialized;
    }

    public shutDown(): Promise<boolean> {
        return super.destroy().then(() =>
            this.pool.end()
                .then(() => {
                    this.transition(ADAPTOR_STATE.Disconnected, true);

                    return Promise.resolve(true);
                })).catch(() =>
            Promise.resolve(false)).then(rc => { // "finally" clause analog
            this.emit('disconnect');

            return Promise.resolve(rc);
        });
    }


    /* token */
    /* token */
    /* token */

    public tokenInsertModify(token: ITokenMessage): Promise<ITokenMessageReturned> {

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }

        const uid = UID.sync(18);

        const t = {...token};
        makeObjectNull(t);
        t.tokenId = t.tokenId || uid;

        logger.trace('inserting/updating token %j', t);

        const queryC = <pg.QueryConfig> (this.sql.get('sqlTokenInsertModify'));

        t.templateName = t.templateName && t.templateName.toLocaleLowerCase() || null;

        const sqlObject: pg.QueryConfig = {
            ...queryC,
            values: [
                t.tokenId,
                t.fkUserId,
                t.purpose,
                t.ipAddr,
                t.tsIssuance,
                t.tsRevoked,
                t.revokeReason,
                t.tsExpire,
                t.templateName
            ]
        };

        return this.executeSQL<ITokenMessageReturned>([sqlObject], (res, resolve) => {

            logger.trace('success: query result [%j]', { command: res.command, rowCount: res.rowCount });
            const row = res.rows[0];
            /*
             id, fk_user_id, purpose, ip_addr, timestamp_issued, timestamp_revoked, revoke_reason, timestamp_expire, s1.template_name
             */
            const rc: ITokenMessageReturned = {
                tokenId: row['id'] as string,
                fkUserId: row['fk_user_id'] as number,
                purpose: row['purpose'] as string,
                ipAddr: row['ip_addr'] as string,
                tsIssuance: row['timestamp_issued'] as number,
                tsRevoked: row['timestamp_revoked'] as number,
                revokeReason: row['revoke_reason'] as string,
                tsExpire: row['timestamp_expire'] as number,
                tsExpireCache: row['timestamp_expire'] as number,
                templateId: row['fk_cookie_template_id'] as number
            };
            logger.debug('success: "creating token", returned values %j', rc);
            resolve(rc);
        });
    }

    public tokenInsertModifyProperty(
        tokenId: string,
        modifications: IPropertiesModifyMessage[]): Promise<ITokenPropertiesModifyMessageReturned[]> {

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        const propNames: string[] = [];
        const propValues: string[] = [];
        const invisibles: boolean[] = [];

        for (const mod of modifications) {
            propNames.push(mod.propName);
            propValues.push(mod.propValue);
            invisibles.push(mod.invisible);
        }

        logger.trace('token %s modification list %j', tokenId, modifications);
        const queryConfig = <pg.QueryConfig> (this.sql.get('sqlTokenInsertModifyProperty'));

        const sqlObject: pg.QueryConfig = {
            ...queryConfig,
            values: [
                tokenId,
                propNames,
                propValues,
                invisibles]
            };

        return this.executeSQL<ITokenPropertiesModifyMessageReturned[]>([sqlObject], (res, resolve: Function) => {
            logger.trace('%d of rows modified/inserted for token %s', res.rowCount, tokenId);
            const rc = res.rows.filter((raw: any) => raw['invisible'] === false)
            .map((raw: any) => {
                const tpmr: ITokenPropertiesModifyMessageReturned = {
                    propName: raw['session_prop_name'],
                    propValue : raw['session_prop_value'],
                    invisible : raw['invisible'],
                    fkTokenId : raw['fk_token_id']
                };

                return tpmr;
            });
            resolve(rc);
        });

    }

    public tokenAssociateWithUser(tokenId: string, userId: number): Promise< boolean > {

        logger.trace('assoiate token %s with user %d', tokenId, userId);

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }

        const queryConfig = <pg.QueryConfig> (this.sql.get('sqlTokenAssociateWithUser'));

        const sqlObject: pg.QueryConfig = {
            ...queryConfig,
            values: [userId, tokenId]
        };

        return this.executeSQLMutation<boolean>([sqlObject], (_res: any, resolve: Function) => {
            logger.trace('success: Token %s associated with user %d.', tokenId, userId);
            resolve(true);
        });
    }

    public tokenInsertRevoke(fkUserId: number, purpose: string, ipAddr: string): Promise<ITokenMessageReturned> {

        logger.trace('insert new token type [%s] and expire older ones for user %d', purpose, fkUserId);

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        // --  1 token id, 2 fk_user_id, 3 ip, 4 issuance/rovoke timestamp, 5 purpose

        const queryConfig = <pg.QueryConfig> (this.sql.get('sqlInsertRevoke'));
        const revokeTime = Date.now();
        const tokenId = UID.sync(18);
        const sqlObject: pg.QueryConfig = {
            ...queryConfig,
            values: [
                tokenId,
                fkUserId,
                ipAddr,
                revokeTime,
                purpose
            ]
        };
        let nrRevoked = 0;
        let nrInserted = 0;

        return this.executeSQLMutation<ITokenMessageReturned>([sqlObject], (res, resolve: Function) => {
            const result: ITokenMessageReturned = res.rows.map((raw: any) => {
                const rc: ITokenMessageReturned = {
                    tokenId: raw['id'],
                    fkUserId: raw['fk_user_id'],
                    purpose: raw['purpose'],
                    ipAddr: raw['ip_addr'],
                    tsIssuance: raw['timestamp_issued'],
                    tsRevoked: raw['timestamp_revoked'],
                    revokeReason: raw['revoke_reason'],
                    tsExpire: raw['timestamp_expire'],
                    tsExpireCache: raw['timestamp_expire'],
                    templateId: raw['fk_cookie_template_id']
                };
                if (!rc.revokeReason) {
                    nrInserted++;
                } else {
                    nrRevoked++;
                }

                return rc;
            }).filter((t: ITokenMessageReturned) => t.tokenId === tokenId)[0]; // Only pick the one inserted
            logger.trace('success: new token %s inserted [%d], %d expired', tokenId, nrInserted, nrRevoked);
            if (result) {
                return resolve(result);
            }
            throw new AdaptorError(`no token type ${purpose} was inserted for user ${fkUserId}`, this.state);
        });
    }

    public tokenGC(deleteOlderThen: number): Promise<number> {

        logger.trace('Remove all tokens expired before %s', new Date(deleteOlderThen).toUTCString());

        const queryObject = <pg.QueryConfig> (this.sql.get('sqlTokenGC'));

        const sqlObject: pg.QueryConfig = {...queryObject,  values: [deleteOlderThen]};

        return this.executeSQL<number>([sqlObject], (res, resolve) => {
            logger.trace('success: number of tokens expired %d', res.rowCount);
            resolve(res.rowCount);
        });
    }

    public tokenSelectAllByFilter(
        timestampExpire: number | null,
        startTimestampRevoked: number,
        endTimestampRevoked: number): Promise<ITokensAndPropsMessage [] > {

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }

        const qc = <pg.QueryConfig> (this.sql.get('sqlTokenSelectAllByFilter'));

        const sqlObject: pg.QueryConfig = {
            ...qc,
            values: [timestampExpire, startTimestampRevoked, endTimestampRevoked]
        };

        return this.executeSQL<ITokensAndPropsMessage[]>([sqlObject], (res, resolve) => {

            logger.trace('tokenSelectAllByFilter,success: fetching, nr of rows fetched %d', res.rowCount);
            const result: ITokensAndPropsMessage[] = res.rows.map((raw: any) =>
                ({
                    tokenId: raw['token_id'],
                    fkUserId: raw['user_id'],
                    usrName: raw['usr_name'],
                    usrEmail: raw['usr_email'],
                    blackListed: (raw['black_listed'] === raw['user_id']),
                    purpose: raw['purpose'],
                    ipAddr: raw['ip_addr'],
                    tsIssuance: raw['timestamp_issued'],
                    tsRevoked: raw['timestamp_revoked'],
                    tsExpire: raw['timestamp_expire'],
                    tsExpireCache: raw['timestamp_expire'],
                    revokeReason: raw['revoke_reason'],
                    templateName: raw['template_name'],
                    sessionPropName: raw['session_prop_name'],
                    sessionPropValue: raw['session_prop_value'],
                    propName: raw['prop_name'],
                    propValue: raw['prop_value']
                }));
            delete res.rows; // Garbage collect please
            resolve(result);
        });
    }

    public templateSelectAll(): Promise <ITemplatePropsMessage[] > {
        if (!this.connected) {
            this.addErr('Adaptor is not connected');

            return Promise.reject(this.lastErr());
        }

        const queryConfig = <pg.QueryConfig> (this.sql.get('sqlTemplateSelectAll'));
        const sqlObject = {...queryConfig};

        return this.executeSQL<ITemplatePropsMessage[]>([sqlObject], (res, resolve) => {

            logger.trace('templateSelectAll, success: fetching.. nr of rows fetched', res.rowCount);
            const result: ITemplatePropsMessage[] = res.rows.map((raw: any) =>
                ({
                    id: raw['id'],
                    cookieName: raw['cookie_name'],
                    path: raw['path'],
                    maxAge: raw['max_age'],
                    httpOnly: raw['httpOnly'],
                    secure: raw['secure'],
                    domain: raw['domain'],
                    sameSite: raw['same_site'],
                    rolling: raw['rolling'],
                    templateName: raw['template_name']
                }));
            delete res.rows; // Garbage collect please
            resolve(result);
        });
    }

    public tokenSelectAllByUserIdOrName(
        userId: number | null,
        userName: string | null): Promise<ITokensAndPropsMessage[] > {

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is not connected', this.state));
        }

        if ((userId === null && userName === null) || (userId !== null && userName !== null)) {
            return Promise.reject(new AdaptorError('wrong input, userId and userName cannot be both non null or both null.', this.state));
        }

        const queryConfig = <pg.QueryConfig> (this.sql.get('sqlTokenSelectByUserIdOrName'));

        const sqlObject: pg.QueryConfig = {
            ...queryConfig,
            values: [userId, userName]
        };

        return this.executeSQL<ITokensAndPropsMessage[]>([sqlObject], (res, resolve) => {
            const copy = {...res};
            delete copy.rows;
            logger.trace('success: fetching.. statistics on fetch %j', copy);
            const result: ITokensAndPropsMessage[] = res.rows.map((raw: any) =>
                ({
                    tokenId: raw['token_id'],
                    fkUserId: raw['user_id'],
                    usrName: raw['usr_name'],
                    usrEmail: raw['usr_email'],
                    blackListed: (raw['black_listed'] === raw['user_id']),
                    purpose: raw['purpose'],
                    ipAddr: raw['ip_addr'],
                    tsIssuance: raw['timestamp_issued'],
                    tsRevoked: raw['timestamp_revoked'],
                    tsExpire: raw['timestamp_expire'],
                    tsExpireCache: raw['timestamp_expire'],
                    revokeReason: raw['revoke_reason'],
                    templateName: raw['template_name'],
                    sessionPropName: raw['session_prop_name'],
                    sessionPropValue: raw['session_prop_value'],
                    propName: raw['prop_name'],
                    propValue: raw['prop_value']
                }));
            delete res.rows; // Garbage collect please
            resolve(result);
        });
    }


    /* users */
    /* users */
    /* users */

    public userSelectByFilter(_notHavingProp?: string): Promise<IUsersAndPropsMessage[]> {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        logger.warn('select all non-blacklisted users and props, potential expensive operation');
        const qc = <pg.QueryConfig> (this.sql.get('sqlUserSelectAll'));
        const sqlObject = {...qc};

        return this.executeSQL<IUsersAndPropsMessage[]>([sqlObject], (res, resolve) => {

            logger.trace('[selectUserProps]success: fetching.. rows fetched %d', res.rowCount);
            const result: IUsersAndPropsMessage[] = res.rows.map((raw: any) =>
                ({
                    userId: raw.usr_id as number,
                    userName: raw.user_name as string,
                    userEmail: raw.user_email as string,
                    propName: raw.prop_name as string,
                    propValue: raw.prop_value as string
                }));

            resolve(result);
        });
    }

    public userInsert(user: IUserMessageBase): Promise <IUserMessageReturned > {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }

        const u = {...user};
        makeObjectNull(u);

        logger.trace('Inserting user %j', u);

        const qc = <pg.QueryConfig> (this.sql.get('sqlUserInsert'));

        const sqlObject: pg.QueryConfig = {...qc,  values: [u.userName, u.userEmail]};

        return this.executeSQL<IUserMessageReturned>([sqlObject], (res, resolve) => {

            logger.trace('success: query result [%j]', { command: res.command, rowCount: res.rowCount });
            const row = res.rows[0];
            /*
             id, name , email
             */
            const rc: IUserMessageReturned = {
                userId: row['id'] as number,
                userName: row['name'] as string,
                userEmail: row['email'] as string
            };
            logger.debug('success: "creating user", returned values %j', rc);

            return resolve(rc);
        });

    }

    public userInsertModifyProperty(userId: number, modifications: IPropertiesModifyMessage[]):
     Promise<IUserPropertiesModifyMessageReturned [] > {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        const propNames: string[] = [];
        const propValues: string[] = [];
        const invisibles: boolean[] = [];

        if (!modifications.length) {
            return Promise.resolve([]);
        }

        for (const mod of modifications) {
            propNames.push(mod.propName);
            propValues.push(mod.propValue);
            invisibles.push(mod.invisible);
        }


        logger.trace('Modifying userId %d , properties modification %j', userId, modifications);
        const qc = <pg.QueryConfig> (this.sql.get('sqlUserInsertModifyProperty'));

        const sqlObject: pg.QueryConfig = {...qc,  values: [userId, propNames, propValues, invisibles]};

        return this.executeSQL<IUserPropertiesModifyMessageReturned[]>([sqlObject], (res, resolve) => {
            logger.trace('%d of rows modified/inserted for token %s', res.rowCount, userId);
            const rc = res.rows.filter((raw: any) => raw['invisible'] === false)
            .map((raw: any) => {
                    const upmmr: IUserPropertiesModifyMessageReturned = {
                    propName: raw['prop_name'],
                    propValue : raw['prop_value'],
                    invisible : raw['invisible'],
                    fkUserId : raw['fk_user_id']
                    };

                    return upmmr;
                });
            resolve(rc);
        });
    }

    private executeSQLMutation<T>(qcArr: (pg.QueryConfig)[], fn: ResolveResult<T>): Promise < T > {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        logger.debug('exectuting statement', qcArr[0].name);

        return this.executeSQL<T>(qcArr, (res, resolve) => {
            // No error but did we actually update something
            if (res.rowCount === 0) {
                logger.error('Nothing was mutated. %j', res);
                throw new AdaptorError(util.format('Nothing was updated mutated. %j', res), this.state);
            }
            logger.trace('Success: number of rows mutated %d', res.rowCount);

            return fn(res, resolve);
        });
    }


    private loadSQLStatements(): Promise <boolean> {
        this.sql.clear();

        const files = {...sqlFiles};
        /*let _file: keyof SQLFiles;
        for (_file in files) {
            files[_file] = path.join(__dirname, files[_file]);
        }*/
        const self = this;

        function processLoadingResults(sql: ISQLFiles): number {
            const nrErrors = 0;
            let _file: keyof ISQLFiles;

            for (_file in sql) {
                /* this never happens because its all included via require */

                // If ((sql[_file] as any) instanceof Error) {
                //    NrErrors++;
                //    Self.addErr('Could not load sql file: %s', _file);
                //    Logger.error(this.lastErr());
                //    Continue;
                // }

                const query: pg.QueryConfig = {
                    text: sql[_file],
                    name: _file
                };
                logger.trace('loaded file [%s]', _file);
                self.sql.set(_file, query);
            }

            return nrErrors;
        }
        const rc = processLoadingResults(files);

        return rc > 0 ? Promise.resolve(false) : Promise.resolve(true);
        /*
                return loadFiles<SQLFiles>(files).then((sql) => {
                    let rc = processLoadingResults(sql);
                    return rc > 0 ? Promise.resolve(false) : Promise.resolve(true);
                });
        */

    }

    private executeSQL<T>(qcArr: (pg.QueryConfig)[], fn: ResolveResult<T>): Promise < T > {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }

        return new Promise<T>((resolveFinal, rejectFinal) => {
            if (qcArr.length === 0) {
                const qryResult: pg.QueryResult = { command: 'EMPTY COMMAND', rowCount: 0, oid: 0, rows: [] };

                return fn(qryResult, resolveFinal);
            }
            this.pool.connect((err, client, done) => {
                if (err) {
                    this.addErr(err);
                    logger.error('could not aquire a client from the pool because:[%j]', err);
                    client && client.emit('drain');
                    done();

                    return rejectFinal(err);
                }
                logger.debug('..client aquired');
                const copyArr = qcArr.slice();

                // Iterative function
                const _do = (q: pg.QueryConfig) => {
                    client.query(q).then((value: pg.QueryResult) => {
                        logger.debug('query done %s', q.name);
                        const nextQc = copyArr.shift();
                        if (nextQc !== undefined) {
                            return _do(nextQc);
                        }
                        client.emit('drain');
                        done();

                        return fn(value, resolveFinal);
                    })
                        .catch(e => {
                            client.emit('drain');
                            done();
                            rejectFinal(e);
                        });

                };
                const query = copyArr.shift();
                query && _do(query);
            });
        });
    }


}

