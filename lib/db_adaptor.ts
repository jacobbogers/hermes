import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as pg from 'pg';
import * as EventEmitter from 'events';
import * as util from 'util';
import * as UID from 'uid-safe';



import { logger } from './logger';
import { makeObjectNull } from './validation';


import {
    ifNull,
    ifInvalidPortString,
    staticCast
    // ifUndefined,
    // ifEmptyString
} from './validation';

interface AnyObjProps {
    [index: string]: string;
}


export interface UsersAndProps {
    userId: number;
    userName: string;
    userEmail: string;
    propName: string;
    propValue: string;
}

export interface TokenMessage {
    tokenId?: string;
    fkUserId?: number;
    purpose: string;
    ipAddr: string;
    tsIssuance?: number;
    tsExpire?: number;
    templateName: string;
}

export interface TokensAndProps {
    tokenId: string;
    fkuserId: number;
    usrName: string;
    usrEmail: string;
    blackListed?: number | null;
    purpose: string;
    ipAddr: string;
    tsIssuance: number;
    tsRevoked: number | null;
    tsExpire: number;
    revokeReason: string | null;
    templateName: string;
    sessionPropName: string;
    sessionPropValue: string;
}

interface SQLFiles {
    sqlTokenAddProperty: string;
    sqlTokenAssociateWithUser: string;
    sqlTokenCreate: string;
    sqlTokenDoExpire: string;
    sqlTokenGC: string;
    //
    sqlTokenSelectAllByFilter: string;
    //
    sqlTokenSelectByUserIdOrName: string;
    //
    sqlUserAddProperty: string;
    sqlUserCreate: string;
    sqlUserRemoveProperty: string;
    sqlUserSelectAllBlackListed: string;
    sqlUserSelectAllNonBlackListed: string;
}


type ResolveResult<T> = (res: pg.QueryResult, resolve: (rc: T | undefined) => void) => void;



const sqlFiles: SQLFiles = {
    sqlTokenAddProperty: './sql/token_add_property.sql',
    sqlTokenAssociateWithUser: './sql/token_associate_with_user.sql',
    sqlTokenCreate: './sql/token_create.sql',
    sqlTokenDoExpire: './sql/token_do_expire.sql',
    sqlTokenGC: './sql/token_gc.sql',
    //
    sqlTokenSelectAllByFilter: './sql/token_select_all_by_filter.sql',
    sqlTokenSelectByUserIdOrName: 'sql/token_select_by_userid_or_name.sql',
    // 
    sqlUserAddProperty: 'sql/user_add_property.sql',
    sqlUserCreate: 'sql/user_create.sql',
    sqlUserRemoveProperty: 'sql/user_remove_property.sql',
    sqlUserSelectAllBlackListed: 'sql/user_select_all_blacklisted.sql',
    sqlUserSelectAllNonBlackListed: 'sql/user_select_all_non_blacklisted.sql'
};

type SqlFileKeys = keyof SQLFiles;

/* state machine , for tear-down and startup of database adaptor */
/* state machine , for tear-down and startup of database adaptor */
/* state machine , for tear-down and startup of database adaptor */

export enum ADAPTOR_STATE {
    UnInitialized = 0,
    Initializing,
    Initialized,
    Connecting,
    Connected,
    Disconnecting,
    Disconnected,
    ERR_Initializing,
    ERR_Connecting,

}

interface StateTransition {
    from: ADAPTOR_STATE[];
    to: ADAPTOR_STATE[];
}

const transitions: StateTransition[] = [
    {
        from: [ADAPTOR_STATE.ERR_Initializing, ADAPTOR_STATE.ERR_Connecting],
        to: [ADAPTOR_STATE.Initializing]
    },
    {
        from: [ADAPTOR_STATE.UnInitialized],
        to: [ADAPTOR_STATE.Initializing]
    },
    {
        from: [ADAPTOR_STATE.Initializing],
        to: [ADAPTOR_STATE.Initialized]
    },
    {
        from: [ADAPTOR_STATE.Initialized],
        to: [ADAPTOR_STATE.Connecting]
    },
    {
        from: [ADAPTOR_STATE.Connecting],
        to: [ADAPTOR_STATE.Connected]
    },
    {
        from: [ADAPTOR_STATE.Connected],
        to: [ADAPTOR_STATE.Disconnecting]
    },
    {
        from: [ADAPTOR_STATE.Connected],
        to: [ADAPTOR_STATE.Disconnected]
    },
    {
        from: [ADAPTOR_STATE.Initializing],
        to: [ADAPTOR_STATE.ERR_Initializing]
    },
    {
        from: [ADAPTOR_STATE.Connecting],
        to: [ADAPTOR_STATE.ERR_Connecting]
    }
];


function moveToState(src: ADAPTOR_STATE, target: ADAPTOR_STATE): boolean {

    let allowed = transitions.filter((t) => {
        if (t.to.length === 1 && t.to.indexOf(target) >= 0) {
            if (t.from.indexOf(src) >= 0) {
                return true;
            }
        }
        return false;
    });
    if (allowed.length > 0) {
        return true;
    }
    return false;
}


/*  database adaptor */
/*  database adaptor */
/*  database adaptor */

export class DBAdaptor extends EventEmitter {
    // private statics


    private static state: ADAPTOR_STATE = ADAPTOR_STATE.UnInitialized;
    static errors: string[] = [];
    static warnings: string[] = [];

    private static addErr(...rest: any[]) {
        DBAdaptor.errors.push(util.format.call(util.format, ...rest));
    }
    private static lastErr(): string {
        return DBAdaptor.errors[DBAdaptor.errors.length - 1];
    }



    // public statics    
    public static adaptor: DBAdaptor;

    public static transition(target: ADAPTOR_STATE, force?: boolean) {
        force = !!force;
        if (force || (!force && moveToState(DBAdaptor.state, target))) {
            DBAdaptor.state = target;
            return true;
        }
        return false;
    }



    public static create(postgresURL: string): Promise<boolean> {

        logger.info('Attemp initialize DBAdaptor');
        if (DBAdaptor.adaptor !== undefined && DBAdaptor !== null) {
            DBAdaptor.addErr('[adaptor] property on DBAdaptor class is not null or undefined');
            DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
            logger.error(DBAdaptor.lastErr());
            return Promise.reject(false);
        }


        if (!DBAdaptor.transition(ADAPTOR_STATE.Initializing)) {
            DBAdaptor.addErr('State cannot transition to [%s] from [%s]', ADAPTOR_STATE[ADAPTOR_STATE.Initializing], ADAPTOR_STATE[DBAdaptor.state]);
            logger.error(DBAdaptor.lastErr());
            return Promise.reject(false);
        }

        let ci = url.parse(postgresURL);
        //collect all errors and warnings
        let errP = DBAdaptor.errors.push.bind(DBAdaptor.errors);
        let warnP = DBAdaptor.warnings.push.bind(DBAdaptor.warnings);
        let pURL = postgresURL;
        DBAdaptor.errors.splice(0);
        DBAdaptor.warnings.splice(0);

        ifNull(warnP, ci.protocol, 'No protocol specified in: %s', pURL);

        ifNull(errP, ci.auth, 'No authentication specified in: %s', pURL);
        ifNull(errP, ci.hostname, 'No host specified in: %s', pURL);

        ifNull(warnP, ci.port, 'No port specified? set to 5432: %s', pURL);
        ci.port = ci.port || '5432';
        let port = Number.parseInt(ci.port);

        ifInvalidPortString(errP, ci.port, 'The port [%s] is not a valid number [%s]', ci.port, pURL);

        ifNull(errP, ci.pathname && ci.pathname.slice(1), 'No database specified in: %s', pURL);
        ifNull(warnP, ci.query, 'No connection parameters specified in: %s', pURL);

        if (DBAdaptor.errors.length > 0) {
            DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
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
        let db = DBAdaptor.adaptor = new DBAdaptor(conf);

        return db.loadSQLStatements()
            .then(() => {
                if (DBAdaptor.errors.length > 0) {
                    DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
                    logger.error(DBAdaptor.lastErr());
                    return Promise.reject(false);
                }

                if (!DBAdaptor.transition(ADAPTOR_STATE.Initialized)) {
                    DBAdaptor.addErr('Could not transition to [Initialized] state');
                    DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
                    logger.error(DBAdaptor.lastErr());
                    return Promise.reject(false);
                }
                logger.info('success loading all sql files');
                return Promise.resolve(true);
            });

    }

    //private methods
    private constructor(config: pg.ClientConfig) {
        super();
        // connect to db
        this.nrClients = 0;
        this.accessCount = 0;
        this.pool = new pg.Pool(config);

        this.pool.on('connect', (/*client: pg.Client*/) => {
            logger.trace('client connected to db [%d]', ++this.nrClients);
        });
        this.pool.on('acquire', (/*client: pg.Client*/) => {
            logger.debug('client acquire to db');
        });
        // client has an error while sitting idel
        this.pool.on('error', (err: Error) => {
            logger.error('idle client error [%j]', err);
            DBAdaptor.addErr('client error when sitting idle, error [%s] [%s]', err.message, err.stack || '');
            this.nrClients--;
        });
        this.sql = new Map();
    }

    private pool: pg.Pool;
    private nrClients: number;
    private accessCount: number;
    private sql: Map<SqlFileKeys, pg.QueryConfig>;
    // private userCache: Map<string, User>;
    //public methods
    get poolSize() {
        return this.nrClients;
    }

    destroy(): Promise<boolean> {
        if (!DBAdaptor.transition(ADAPTOR_STATE.Disconnecting)) {
            DBAdaptor.errors.push('Could not transition to state [disconnecting]');
            return Promise.resolve(false);
        }
        return this.pool.end()
            .then(() => {
                DBAdaptor.transition(ADAPTOR_STATE.Disconnected, true);
                return Promise.resolve(true);
            })
            .catch(() => {
                DBAdaptor.errors.push('Could not transition to state [disconnecting]');
                return Promise.resolve(false);
            });

    }
    /*
        export interface ErrnoException extends Error {
            errno?: number;
            code?: string;
            path?: string;
            syscall?: string;
            stack?: string;
        }
    */
    public loadSQLStatements(): Promise<boolean> {
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
                        DBAdaptor.addErr('Could not load sql file: %s', fileName);
                        logger.error(DBAdaptor.lastErr());
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
        return new Promise<T>((resolveFinal, rejectFinal) => {
            if (qcArr.length === 0) {
                let qryResult: pg.QueryResult = { command: '', rowCount: 0, oid: 0, rows: [] };
                return fn(qryResult, resolveFinal);
            }
            this.pool.connect((err, client, done) => {
                if (err) {
                    done();
                    return rejectFinal(err);
                }
                logger.debug('..client aquired');
                let copyArr = qcArr.slice();

                const _do = (qc: pg.QueryConfig) => {
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

    //  private executeSQL<T>(qcArr: (pg.QueryConfig)[], fn: ResolveResult<T>): Promise<T> {
    private executeSQLMutation<T>(qcArr: (pg.QueryConfig)[], fn: ResolveResult<T>): Promise<T> {

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

    public userCreate(userName: string, email: string): Promise<number> {

        logger.trace('Inserting user [%s]/[%s]', userName, email);
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlUserCreate'));
        let sqlObject = Object.assign({}, qc, { values: [userName, email] }) as pg.QueryConfig;

        return this.executeSQL<number>([sqlObject], (res, resolve) => {
            let answer = (res.rows[0] && res.rows[0].id) || undefined;
            resolve(answer);
        });
    }

    public userAddProperty(userId: number, propName: string, propValue: string): Promise<boolean> {
        logger.trace('trying to add property "%s":"%s" to userId:%d', propName, propValue, userId);

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlUserAddProperty'));
        let sqlObject = Object.assign({}, qc, { values: [userId, propName, propValue] }) as pg.QueryConfig;

        return this.executeSQL<boolean>([sqlObject], (res, resolve) => {
            res;
            // logger.trace('command %s was used to add user Property %s,%s', res.command, propName, propValue);
            logger.trace('success: property "%s":"%s" added to userId:%d', propName, propValue, userId);
            resolve(true);
        });
    }

    public userRemoveProperty(userId: number, propName: string): Promise<boolean> {
        logger.trace('trying to deleting property "%s" from userId:%d', propName, userId);

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlUserRemoveProperty'));
        let sqlObject = Object.assign({}, qc, { values: [userId, propName] }) as pg.QueryConfig;

        return this.executeSQL<boolean>([sqlObject], (res, resolve) => {
            res;
            logger.trace('success: deleting property "%s" from userId:%d', propName, userId);
            resolve(true);
        });
    }

    //helper
    private selectUserProps(qc: pg.QueryConfig): Promise<UsersAndProps[]> {
        let sqlObject = Object.assign({}, qc) as pg.QueryConfig;

        return this.executeSQL<UsersAndProps[]>([sqlObject], (res, resolve) => {
            let copy = Object.assign({}, res);
            delete copy.rows;
            logger.trace('success: fetching.. statistics on fetch %j', copy);
            let result: UsersAndProps[] = res.rows.map((raw: any) => {
                return {
                    userId: raw.usr_id as number,
                    userName: raw.user_name as string,
                    userEmail: raw.user_email as string,
                    propName: raw.prop_name as string,
                    propValue: raw.prop_value as string
                };
            });
            delete res.rows; // garbage collect please
            resolve(result);
        });
    }


    public userSelectAllNONBlackListed(): Promise<UsersAndProps[]> {
        logger.warn('selecting all non-blacklisted users, potential expensive operation');
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlUserSelectAllNonBlackListed'));
        let sqlObject = Object.assign({}, qc) as pg.QueryConfig;

        return this.selectUserProps(sqlObject);

    }

    public userSelectAllBlackListed(): Promise<UsersAndProps[]> {
        logger.warn('selecting all blacklisted users, potential expensive operation');
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlUserSelectAllBlackListed'));
        let sqlObject = Object.assign({}, qc) as pg.QueryConfig;
        return this.selectUserProps(sqlObject);

    }


    public tokenCreate(token: TokenMessage): Promise<Partial<TokenMessage>> {

        let uid = UID.sync(18);

        let t = Object.assign({}, token);
        makeObjectNull(t);
        t.tokenId = t.tokenId || uid,

            logger.trace('creating a new token %j with properties', t);

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenCreate'));

        let sqlObject = Object.assign({}, qc, { values: [t.tokenId, t.fkUserId, t.purpose, t.ipAddr, t.tsIssuance, t.tsExpire, t.templateName] }) as pg.QueryConfig;

        return this.executeSQL<Partial<TokenMessage>>([sqlObject], (res, resolve) => {
            logger.trace('success: query result [%j]', res);
            let row = res.rows[0];
            let rc: Partial<TokenMessage> = {
                tokenId: row['uid'] as string,
                fkUserId: row['fk_user'] as number,
                tsIssuance: row['timestamp_issued'],
                tsExpire: row['timestamp_expire'],
                templateName: '' + row['fk_cookie_template_id']
                //    , fk_user,timestamp_issued, timestamp_expire,fk_cookie_template_id
            };
            logger.debug('success: "creating token", returned values %j', rc);
            resolve(rc);
        });
    }

    public tokenAddProperty(tokenId: string, propName: string, propValue: string): Promise<boolean> {

        logger.trace('add a property to token %s , propName:%s, propValue:%s', tokenId, propName, propValue);
        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenAddProperty'));

        let sqlObject = Object.assign({}, qc, { values: [tokenId, propName, propValue] }) as pg.QueryConfig;

        return this.executeSQL<boolean>([sqlObject], (res, resolve) => {
            res;
            logger.trace('success: adding property %s to token %s.', propName, tokenId);
            resolve(true);
        });

    }

    public tokenAssociateWithUser(tokenId: string, userId: number): Promise<boolean> {

        logger.trace('assoiate token %s with user %d', tokenId, userId);
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
            return Promise.reject(new Error('no cleanup time given'));
        }
        logger.trace('Remove all tokens expired before %s', new Date(deleteBeforeExpireTime).toUTCString());

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenGC'));

        let sqlObject = Object.assign({}, qc, { values: [deleteBeforeExpireTime] }) as pg.QueryConfig;

        return this.executeSQL<number>([sqlObject], (res, resolve) => {
            logger.trace('success: number of tokens expired %d', res.rowCount);
            resolve(res.rowCount);
        });
    }

    public tokenSelectAllByFilter(timestampExpire: number, startTimestampRevoked: number, endTimestampRevoked: number): Promise<TokensAndProps[]> {

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenSelectAllByFilter'));

        let sqlObject = Object.assign({}, qc, { values: [timestampExpire, startTimestampRevoked, endTimestampRevoked] }) as pg.QueryConfig;

        return this.executeSQL<TokensAndProps[]>([sqlObject], (res, resolve) => {
            let copy = Object.assign({}, res);
            delete copy.rows;
            logger.trace('success: fetching.. statistics on fetch %j', copy);
            let result: TokensAndProps[] = res.rows.map((raw: any) => {
                return {
                    tokenId: raw['token_id'],
                    fkuserId: raw['user_id'],
                    usrName: raw['usr_name'],
                    usrEmail: raw['usr_email'],
                    blackListed: raw['black_listed'],
                    purpose: raw['purpose'],
                    ipAddr: raw['ip_addr'],
                    tsIssuance: raw['timestamp_issued'],
                    tsRevoked: raw['timestamp_revoked'],
                    tsExpire: raw['timestamp_'],
                    revokeReason: raw['revoke_reason'],
                    templateName: raw['template_name'],
                    sessionPropName: raw['session_prop_name'],
                    sessionPropValue: raw['session_prop_value']
                };
            });
            delete res.rows; // garbage collect please
            resolve(result);
        });
    }

     public tokenSelectAllByUserIdOrName(userId: number|null, userName: string|null): Promise<TokensAndProps[]> {

        let qc = staticCast<pg.QueryConfig>(this.sql.get('sqlTokenSelectByUserIdOrName'));
        
        let sqlObject = Object.assign({}, qc, { values: [userId, userName] }) as pg.QueryConfig;

        return this.executeSQL<TokensAndProps[]>([sqlObject], (res, resolve) => {
            let copy = Object.assign({}, res);
            delete copy.rows;
            logger.trace('success: fetching.. statistics on fetch %j', copy);
            let result: TokensAndProps[] = res.rows.map((raw: any) => {
                return {
                    tokenId: raw['token_id'],
                    fkuserId: raw['user_id'],
                    usrName: raw['usr_name'],
                    usrEmail: raw['usr_email'],
                    blackListed: raw['black_listed'],
                    purpose: raw['purpose'],
                    ipAddr: raw['ip_addr'],
                    tsIssuance: raw['timestamp_issued'],
                    tsRevoked: raw['timestamp_revoked'],
                    tsExpire: raw['timestamp_'],
                    revokeReason: raw['revoke_reason'],
                    templateName: raw['template_name'],
                    sessionPropName: raw['session_prop_name'],
                    sessionPropValue: raw['session_prop_value']
                };
            });
            delete res.rows; // garbage collect please
            resolve(result);
        });
    }

}





