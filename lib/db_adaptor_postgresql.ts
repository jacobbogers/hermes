import * as fs from 'fs';
import * as path from 'path';
import * as URL from 'url';
import * as pg from 'pg';
import * as util from 'util';
import * as UID from 'uid-safe';



import { logger } from './logger';
import { makeObjectNull } from './utils';
import {
    //general
    AdaptorBase,
    ADAPTOR_STATE,
    AdaptorError,
    PropertiesModifyMessage,
    //user
    UsersAndPropsMessage,
    UserMessageBase,
    UserMessageReturned,
    UserPropertiesModifyMessageReturned,
    //tokens
    TokenMessage,
    TokensAndPropsMessage,
    TokenMessageReturned,
    TokenPropertiesModifyMessageReturned,
    //templates
    TemplatePropsMessage
} from './db_adaptor_base';


import {
    ifNull,
    ifInvalidPortString,
    staticCast,
    AnyObjProps
    // ifUndefined,
    // ifEmptyString
} from './utils';

interface SQLFiles {
    sqlTokenInsertModifyProperty: string;
    sqlTokenAssociateWithUser: string;
    sqlTokenInsertModify: string;
    sqlTokenDoExpire: string;
    sqlTokenGC: string;
    //
    sqlTokenSelectAllByFilter: string;
    //
    sqlTokenSelectByUserIdOrName: string;
    //
    sqlUserGc: string;
    sqlUserInsertModify: string;
    sqlUserInsertModifyProperty: string;
    sqlUserSelectAll: string;
    //
    sqlTemplateSelectAll: string;
}

type ResolveResult<T> = (res: pg.QueryResult, resolve: (rc: T | undefined) => void) => void;

const sqlFiles: SQLFiles = {
    sqlTokenInsertModifyProperty: './sql/token_insert_modify_property.sql',
    sqlTokenAssociateWithUser: './sql/token_associate_with_user.sql',
    sqlTokenInsertModify: './sql/token_insert_modify.sql',
    sqlTokenDoExpire: './sql/token_do_expire.sql',
    sqlTokenGC: './sql/token_gc.sql',
    //
    sqlTokenSelectAllByFilter: './sql/token_select_all_by_filter.sql',
    sqlTokenSelectByUserIdOrName: 'sql/token_select_by_userid_or_name.sql',
    // 
    sqlUserGc: './sql/user_gc.sql',
    sqlUserInsertModify: 'sql/user_insert_modify.sql',
    sqlUserInsertModifyProperty: 'sql/user_insert_modify_property.sql',
    sqlUserSelectAll: 'sql/user_select_all.sql',
    //
    sqlTemplateSelectAll: 'sql/template_select_all.sql'

};

type SqlFileKeys = keyof SQLFiles;

/*  database adaptor */
/*  database adaptor */
/*  database adaptor */

export interface AdaptorPostgreSQLProperties {
    url: string;
}

export class AdaptorPostgreSQL extends AdaptorBase {

    private _url: string;
    private pool: pg.Pool;
    private nrClients: number;
    private accessCount: number;
    private sql: Map<SqlFileKeys, pg.QueryConfig>;

    public init(): Promise<boolean> {

        let pURL = this._url;

        if (!this.transition(ADAPTOR_STATE.Initializing)) {
            this.addErr('State cannot transition to [%s] from [%s]', ADAPTOR_STATE[ADAPTOR_STATE.Initializing], ADAPTOR_STATE[this.state]);
            logger.error(this.lastErr());
            return Promise.reject(false);
        }

        let ci = URL.parse(pURL);
        //collect all errors and warnings
        let errP = this.errors.push.bind(this.errors);
        let warnP = this.warnings.push.bind(this.warnings);

        this.errors.splice(0);
        this.warnings.splice(0);

        ifNull(warnP, ci.protocol, 'No protocol specified in: %s', pURL);
        ifNull(errP, ci.auth, 'No authentication specified in: %s', pURL);
        ifNull(errP, ci.hostname, 'No host specified in: %s', pURL);

        ifNull(warnP, ci.port, 'No port specified? set to 5432: %s', pURL);
        ci.port = ci.port || '5432';
        let port = Number.parseInt(ci.port);

        ifInvalidPortString(errP, ci.port, 'The port [%s] is not a valid number [%s]', ci.port, pURL);

        ifNull(errP, ci.pathname && ci.pathname.slice(1), 'No database specified in: %s', pURL);
        ifNull(warnP, ci.query, 'No connection parameters specified in: %s', pURL);

        if (this.errors.length > 0) {
            this.transition(ADAPTOR_STATE.ERR_Initializing, true);
            return Promise.reject(false);
        }

        let params = ci.query && ci.query.split('&');
        let qry: AnyObjProps = params.reduce((ac: AnyObjProps, val: string) => {
            let [key, value] = val.split('=');
            ac[key] = value;
            return ac;
        }, {});

        let [user, password] = (ci.auth && ci.auth.toLowerCase().split(':')) as string[];
        let database = ci.pathname && ci.pathname.slice(1);
        let host = ci.hostname;

        let conf: pg.PoolConfig = {
            user,
            password,
            database,
            port,
            host,
            ssl: qry['sslmode'] !== 'disable',
            max: 20, //set pool max size  
            min: 14, //set min pool size  
            idleTimeoutMillis: 1000, //ms
            refreshIdle: true
        };
        pg.defaults.parseInt8 = true; // use bigint datatype
        //create the pool

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
        // client has an error while sitting idel
        this.pool.on('error', (err: Error) => {
            logger.error('idle client error [%j]', err);
            this.addErr('client error when sitting idle, error [%s] [%s]', err.message, err.stack || '');
            this.nrClients--;
        });
        this.sql = new Map();

        return this.loadSQLStatements()
            .then(() => {
                if (this.errors.length > 0) {
                    this.transition(ADAPTOR_STATE.ERR_Initializing, true);
                    logger.error(this.lastErr());
                    this.destroy(); //close it down;
                    return Promise.reject(false);
                }

                if (!this.transition(ADAPTOR_STATE.Initialized)) {
                    this.addErr('Could not transition to [Initialized] state');
                    this.transition(ADAPTOR_STATE.ERR_Initializing, true);
                    logger.error(this.lastErr());
                    this.destroy();
                    return Promise.reject(false);
                }
                logger.info('success loading all sql files');
                return Promise.resolve(true);
            });
    }

    //private methods
    public constructor(app: AdaptorPostgreSQLProperties) {
        super();
        this._url = app.url;
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
        return super.destroy().then(() => {
            return this.pool.end()
                .then(() => {
                    this.transition(ADAPTOR_STATE.Disconnected, true);
                    this.emit('disconnect');
                    return Promise.resolve(true);
                });
        }).catch(() => {
            return Promise.resolve(false);
        });
    }



    private loadSQLStatements(): Promise<boolean> {
        this.sql.clear();

        let fileCount = Object.keys(sqlFiles).length;
        logger.trace('Number of sql files to load: [%d]', fileCount);
        let errCount = 0;

        return new Promise<boolean>((resolve, reject) => {
            Object.keys(sqlFiles).forEach((key: SqlFileKeys) => {
                let fileName = path.join(__dirname, sqlFiles[key]);
                fs.readFile(fileName, { flag: 'r', encoding: 'utf8' }, (err, data) => {

                    fileCount--;
                    if (err) {
                        this.addErr('Could not load sql file: %s', fileName);
                        logger.error(this.lastErr());
                        errCount++;
                    }
                    else {
                        let qc: pg.QueryConfig = {
                            text: data,
                            name: key
                        };
                        logger.trace('loaded file [%s]->[%s]', key, fileName);
                        this.sql.set(key, qc);
                    }
                    if (fileCount === 0) {
                        if (errCount > 0) {
                            logger.error('Some errors ocurred when loading sql files');
                            return reject(false);
                        }
                        logger.info('All sql files loadded successfully');
                        return resolve(true);
                    }
                });
            });
        });
    }

    private executeSQL<T>(qcArr: (pg.QueryConfig)[], fn: ResolveResult<T>): Promise<T> {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        return new Promise<T>((resolveFinal, rejectFinal) => {
            if (qcArr.length === 0) {
                let qryResult: pg.QueryResult = { command: 'EMPTY COMMAND', rowCount: 0, oid: 0, rows: [] };
                return fn(qryResult, resolveFinal);
            }
            this.pool.connect((err, client, done) => {
                if (err) {
                    logger.error('could not aquire a client from the pool because:[%j]', err);
                    done();
                    return rejectFinal(err);
                }
                logger.debug('..client aquired');
                let copyArr = qcArr.slice();

                //iterative function
                const _do = (qc: pg.QueryConfig) => {
                    logger.debug('executing query: %s', qc.name);
                    client.query(qc).then((value: pg.QueryResult) => {
                        let nextQc = copyArr.shift();
                        if (nextQc !== undefined) {
                            return _do(nextQc);
                        }
                        done();
                        return fn(value, resolveFinal);
                    })
                        .catch((err) => {
                            rejectFinal(err);
                            done();
                        });

                };
                let qc = copyArr.shift();
                qc && _do(qc);
            });
        });
    }


    private executeSQLMutation<T>(qcArr: (pg.QueryConfig)[], fn: ResolveResult<T>): Promise<T> {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        logger.debug('exectuting statement', qcArr[0].name);

        return this.executeSQL<T>(qcArr, (res, resolve) => {
            //no error but did we actually update something
            if (res.rowCount === 0) {
                logger.error('Nothing was mutated. %j', res);
                throw new Error(util.format('Nothing was updated mutated. %j', res));
            }
            logger.trace('Success: number of rows mutated %d', res.rowCount);
            return fn(res, resolve);
        });
    }

    /* token */
    /* token */
    /* token */

    public tokenInsertModify(token: TokenMessage): Promise<TokenMessageReturned> {

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }

        let uid = UID.sync(18);

        let t = Object.assign({}, token);
        makeObjectNull(t);
        t.tokenId = t.tokenId || uid;

        logger.trace('inserting/updating token %j', t);

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenInsertModify'));

        let sqlObject = Object.assign({}, qc, { values: [t.tokenId, t.fkUserId, t.purpose, t.ipAddr, t.tsIssuance, t.tsRevoked, t.revokeReason, t.tsExpire, t.templateName] }) as pg.QueryConfig;

        return this.executeSQL<TokenMessageReturned>([sqlObject], (res, resolve) => {

            logger.trace('success: query result [%j]', { command: res.command, rowCount: res.rowCount });
            let row = res.rows[0];
            /*
             id, fk_user_id, purpose, ip_addr, timestamp_issued, timestamp_revoked, revoke_reason, timestamp_expire, s1.template_name
             */
            let rc: TokenMessageReturned = {
                tokenId: row['id'] as string,
                fkUserId: row['fk_user_id'] as number,
                purpose: row['purpose'] as string,
                ipAddr: row['ip_addr'] as string,
                tsIssuance: row['timestamp_issued'] as number,
                tsRevoked: row['timestamp_revoked'] as number,
                revokeReason: row['revoke_reason'] as string,
                tsExpire: row['timestamp_expire'] as number,
                templateId: row['fk_cookie_template_id'] as number
            };
            logger.debug('success: "creating token", returned values %j', rc);
            resolve(rc);
        });
    }

    public tokenInsertModifyProperty(tokenId: string, modifications: PropertiesModifyMessage[]): Promise<TokenPropertiesModifyMessageReturned[]> {

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        let propNames: string[] = [];
        let propValues: string[] = [];
        let invisibles: boolean[] = [];

        for (let mod of modifications) {
            propNames.push(mod.propName);
            propValues.push(mod.propValue);
            invisibles.push(mod.invisible);
        }

        logger.trace('token %s modification list %j', tokenId, modifications);
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenInsertModifyProperty'));

        let sqlObject = Object.assign({}, qc, { values: [tokenId, propNames, propValues, invisibles] }) as pg.QueryConfig;

        return this.executeSQL<TokenPropertiesModifyMessageReturned[]>([sqlObject], (res, resolve) => {
            logger.trace('%d of rows modified/inserted for token %s', res.rowCount, tokenId);
            let rc = res.rows.filter((raw) => {
                //fk_token_id, session_prop_name, session_prop_value, invisible   
                return raw['invisible'] === false;
            }).map((raw) => {
                return {
                    propName: raw['session_prop_name'],
                    propValue: raw['session_prop_value'],
                    invisible: raw['invisible'],
                    fkTokenId: raw['fk_token_id']
                } as TokenPropertiesModifyMessageReturned;
            });
            resolve(rc);
        });

    }

    public tokenAssociateWithUser(tokenId: string, userId: number): Promise<boolean> {

        logger.trace('assoiate token %s with user %d', tokenId, userId);

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenAssociateWithUser'));

        let sqlObject = Object.assign({}, qc, { values: [userId, tokenId] }) as pg.QueryConfig;

        return this.executeSQLMutation<boolean>([sqlObject], (res, resolve) => {
            res;
            logger.trace('success: Token %s associated with user %d.', tokenId, userId);
            resolve(true);
        });
    }

    public tokenDoExpire(tokenId: string, expireReason: string, expireTime?: number | null): Promise<boolean> {

        logger.trace('Expire token %s with reason %s at time %s', tokenId, expireReason, new Date(expireReason).toUTCString());

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenDoExpire'));

        if (expireTime === undefined) {
            expireTime = null;
        }

        let sqlObject = Object.assign({}, qc, { values: [tokenId, expireReason, expireTime] }) as pg.QueryConfig;

        return this.executeSQLMutation<boolean>([sqlObject], (res, resolve) => {
            res;
            logger.trace('success: token %s expired', tokenId);
            resolve(true);
        });
    }

    public tokenGC(deleteBeforeExpireTime: number): Promise<number> {

        if (!deleteBeforeExpireTime) {
            logger.error('No "deleteBeforeExpireTime" argument given!');
            return Promise.reject(new AdaptorError('no cleanup time given,', this.state));
        }
        logger.trace('Remove all tokens expired before %s', new Date(deleteBeforeExpireTime).toUTCString());

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenGC'));

        let sqlObject = Object.assign({}, qc, { values: [deleteBeforeExpireTime] }) as pg.QueryConfig;

        return this.executeSQL<number>([sqlObject], (res, resolve) => {
            logger.trace('success: number of tokens expired %d', res.rowCount);
            resolve(res.rowCount);
        });
    }

    public tokenSelectAllByFilter(timestampExpire: number | null, startTimestampRevoked: number, endTimestampRevoked: number): Promise<TokensAndPropsMessage[]> {

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenSelectAllByFilter'));

        let sqlObject = Object.assign({}, qc, { values: [timestampExpire, startTimestampRevoked, endTimestampRevoked] }) as pg.QueryConfig;

        return this.executeSQL<TokensAndPropsMessage[]>([sqlObject], (res, resolve) => {

            logger.trace('tokenSelectAllByFilter,success: fetching, nr of rows fetched %d', res.rowCount);
            let result: TokensAndPropsMessage[] = res.rows.map((raw: any) => {
                return {
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
                    revokeReason: raw['revoke_reason'],
                    templateName: raw['template_name'],
                    sessionPropName: raw['session_prop_name'],
                    sessionPropValue: raw['session_prop_value'],
                    propName: raw['prop_name'],
                    propValue: raw['prop_value']
                };
            });
            delete res.rows; // garbage collect please
            resolve(result);
        });
    }

    public templateSelectAll(): Promise<TemplatePropsMessage[]> {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is not connected', this.state));
        }

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTemplateSelectAll'));
        let sqlObject = Object.assign({}, qc) as pg.QueryConfig;
        return this.executeSQL<TemplatePropsMessage[]>([sqlObject], (res, resolve) => {

            logger.trace('templateSelectAll, success: fetching.. nr of rows fetched', res.rowCount);
            let result: TemplatePropsMessage[] = res.rows.map((raw: any) => {
                return {
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
                };
            });
            delete res.rows; // garbage collect please
            resolve(result);
        });
    }

    public tokenSelectAllByUserIdOrName(userId: number | null, userName: string | null): Promise<TokensAndPropsMessage[]> {

        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is not connected', this.state));
        }

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenSelectByUserIdOrName'));

        let sqlObject = Object.assign({}, qc, { values: [userId, userName] }) as pg.QueryConfig;

        return this.executeSQL<TokensAndPropsMessage[]>([sqlObject], (res, resolve) => {
            let copy = Object.assign({}, res);
            delete copy.rows;
            logger.trace('success: fetching.. statistics on fetch %j', copy);
            let result: TokensAndPropsMessage[] = res.rows.map((raw: any) => {
                return {
                    tokenId: raw['token_id'],
                    fkUserId: raw['user_id'],
                    usrName: raw['usr_name'],
                    usrEmail: raw['usr_email'],
                    blackListed: (raw['black_listed'] === raw['user_id']),
                    purpose: raw['purpose'],
                    ipAddr: raw['ip_addr'],
                    tsIssuance: raw['timestamp_issued'],
                    tsRevoked: raw['timestamp_revoked'],
                    tsExpire: raw['timestamp_'],
                    revokeReason: raw['revoke_reason'],
                    templateName: raw['template_name'],
                    sessionPropName: raw['session_prop_name'],
                    sessionPropValue: raw['session_prop_value'],
                    propName: raw['prop_name'],
                    propValue: raw['prop_value']
                };
            });
            delete res.rows; // garbage collect please
            resolve(result);
        });
    }


    /* users */
    /* users */
    /* users */

    public userSelectByFilter(notHavingProp?: string): Promise<UsersAndPropsMessage[]> {
        notHavingProp;
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        logger.warn('select all non-blacklisted users and props, potential expensive operation');
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlUserSelectAll'));
        let sqlObject = Object.assign({}, qc) as pg.QueryConfig;
        return this.executeSQL<UsersAndPropsMessage[]>([sqlObject], (res, resolve) => {

            logger.trace('[selectUserProps]success: fetching.. rows fetched %d', res.rowCount);
            let result: UsersAndPropsMessage[] = res.rows.map((raw: any) => {
                return {
                    userId: raw.usr_id as number,
                    userName: raw.user_name as string,
                    userEmail: raw.user_email as string,
                    propName: raw.prop_name as string,
                    propValue: raw.prop_value as string
                };
            });

            resolve(result);
        });
    }

    public userInsertModify(user: UserMessageBase): Promise<UserMessageReturned> {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }

        let u = Object.assign({}, user);
        makeObjectNull(u);

        logger.trace('inserting/updating user %j', u);

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlUserInsertModify'));

        let sqlObject = Object.assign({}, qc, { values: [u.userName, u.userEmail] }) as pg.QueryConfig;

        return this.executeSQL<UserMessageReturned>([sqlObject], (res, resolve) => {

            logger.trace('success: query result [%j]', { command: res.command, rowCount: res.rowCount });
            let row = res.rows[0];
            /*
             id, name , email 
             */
            let rc: UserMessageReturned = {
                userId: row['id'] as number,
                userName: row['name'] as string,
                userEmail: row['email'] as string
            };
            logger.debug('success: "creating token", returned values %j', rc);
            resolve(rc);
        });

    }

    public userInsertModifyProperty(userId: number, modifications: PropertiesModifyMessage[]): Promise<UserPropertiesModifyMessageReturned[]> {
        if (!this.connected) {
            return Promise.reject(new AdaptorError('Adaptor is in the wrong state:', this.state));
        }
        let propNames: string[] = [];
        let propValues: string[] = [];
        let invisibles: boolean[] = [];

        for (let mod of modifications) {
            propNames.push(mod.propName);
            propValues.push(mod.propValue);
            invisibles.push(mod.invisible);
        }

        logger.trace('token %s modification list %j', userId, modifications);
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlUserInsertModifyProperty'));

        let sqlObject = Object.assign({}, qc, { values: [userId, propNames, propValues, invisibles] }) as pg.QueryConfig;

        return this.executeSQL<UserPropertiesModifyMessageReturned[]>([sqlObject], (res, resolve) => {
            logger.trace('%d of rows modified/inserted for token %s', res.rowCount, userId);
            let rc = res.rows.filter((raw) => {
                //fk_token_id, prop_name, prop_value, invisible   
                return raw['invisible'] === false;
            }).map((raw) => {
                return {
                    propName: raw['prop_name'],
                    propValue: raw['prop_value'],
                    invisible: raw['invisible'],
                    fkUserId: raw['fk_user_id']
                } as UserPropertiesModifyMessageReturned;
            });
            resolve(rc);
        });
    }

}





