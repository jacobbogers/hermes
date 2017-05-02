

import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as pg from 'pg';
import * as EventEmitter from 'events';
import * as util from 'util';


import {
    ifNull,
    ifInvalidPortString
    // ifUndefined,
    // ifEmptyString
} from './validation';

interface AnyObjProps {
    [index: string]: string;
}

//import { User } from './User';

//const sqlFileContents = {} as { [index: string]: string };
//for (let fileName in sqlFiles) {
//    sqlFileContens[fileName] = fs.readFileSync(path.join(__dirname, fileName), { encoding: 'UTF8', flag: 'r' });
//}


interface SQLFiles {
    sqlTokenAddProperty: string;
    sqlTokenAssociateWithUser: string;
    sqlTokenCreate: string;
    sqlTokenDoExpire: string;
    sqlTokenGC: string;
    sqlTokenSelectActive: string;
    sqlTokenSelectAll: string;
    sqlTokenSelectByUserId: string;
    sqlTokenSelectByUsername: string;
    sqlTokenSelectRevoked: string;
    sqlTokenSelectSingle: string;
    //
    sqlUserAddProperty: string;
    sqlUserCreate: string;
    sqlUserRemoveProperty: string;
    sqlUserSelectAllBlackListed: string;
    sqlUserSelectAllNonBlackListed: string;
}

const sqlFiles: SQLFiles = {
    sqlTokenAddProperty: './sql/token_add_property.sql',
    sqlTokenAssociateWithUser: './sql/token_associate_with_user.sql',
    sqlTokenCreate: './sql/token_create.sql',
    sqlTokenDoExpire: './sql/token_do_expire.sql',
    sqlTokenGC: './sql/token_gc.sql',
    sqlTokenSelectActive: './sql/token_select_active.sql',
    sqlTokenSelectAll: 'sql/token_select_all.sql',
    sqlTokenSelectByUserId: 'sql/token_select_by_user_id.sql',
    sqlTokenSelectByUsername: 'sql/token_select_by_user_name.sql',
    sqlTokenSelectRevoked: 'sql/token_select_revoked.sql',
    sqlTokenSelectSingle: 'sql/token_select_single.sql',
    //
    sqlUserAddProperty: 'sql/user_add_property.sql',
    sqlUserCreate: 'sql/user_create.sql',
    sqlUserRemoveProperty: 'sql/user_remove_property.sql',
    sqlUserSelectAllBlackListed: 'sql/user_select_all_blacklisted.sql',
    sqlUserSelectAllNonBlackListed: 'sql/user_select_all_non_blacklisted.sql'
};

type SqlFileKeys = keyof SQLFiles;


//psql postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require

//'postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require'.match(/^postgresql\:\/\/([^\:]+)(:([^\:]+))?@([^\:]+):([0-9]+)\/([^\?]+)\?(.*)$/);
/*
> url.parse('postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require')
Url {
  protocol: 'postgresql:',
  slashes: true,
  auth: 'bookbarter:bookbarter',
  host: 'jacob-bogers.com:5432',
  port: '5432',
  hostname: 'jacob-bogers.com',
  hash: null,
  search: '?sslmode=require',
  query: 'sslmode=require',
  pathname: '/bookbarter',
  path: '/bookbarter?sslmode=require',
  href: 'postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require' }
*/


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


export class DBAdaptor extends EventEmitter {
    // private statics

    private static state: ADAPTOR_STATE = ADAPTOR_STATE.UnInitialized;
    static errors: string[] = [];
    static warnings: string[] = [];



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


        if (DBAdaptor.adaptor !== undefined && DBAdaptor !== null) {
            DBAdaptor.errors.push('[adaptor] property on DBAdaptor class is not null or undefined');
            DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
            return Promise.reject(false);
        }

        if (!DBAdaptor.transition(ADAPTOR_STATE.Initializing)) {
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

        console.log('poolIdleTimeout:', pg.defaults.poolIdleTimeout);
        console.log('t1 %s', new Date().toTimeString());

        //create the pool
        let db = DBAdaptor.adaptor = new DBAdaptor(conf);

        return db.loadSQLStatements()
            .then(() => {
                if (DBAdaptor.errors.length > 0) {
                    DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
                    return Promise.reject(false);
                }

                if (!DBAdaptor.transition(ADAPTOR_STATE.Initialized)) {
                    DBAdaptor.errors.push('Could not transition to [Initialized] state');
                    DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
                    return Promise.reject(false);
                }

                /*if (!DBAdaptor.transition(ADAPTOR_STATE.Connecting, true)) {
                    DBAdaptor.errors.push('Could not transition to [Connecting] state');
                    DBAdaptor.transition(ADAPTOR_STATE.ERR_Connecting, true);
                    return false;
                }*/
                return Promise.resolve(true);
            });

        /*  if (DBAdaptor.errors.length > 0) {
              DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
              return Promise.reject(false);
          }
  
          if (!DBAdaptor.transition(ADAPTOR_STATE.Initialized)) {
              DBAdaptor.errors.push('Could not transition to [Initialized] state');
              DBAdaptor.transition(ADAPTOR_STATE.ERR_Initializing, true);
              return Promise.reject(false);
          }
  
          /*if (!DBAdaptor.transition(ADAPTOR_STATE.Connecting, true)) {
              DBAdaptor.errors.push('Could not transition to [Connecting] state');
              DBAdaptor.transition(ADAPTOR_STATE.ERR_Connecting, true);
              return false;
          }*/

        // return Promise.resolve(true);
    }

    //private methods
    private constructor(config: pg.ClientConfig) {
        super();
        // connect to db
        this.nrClients = 0;
        this.pool = new pg.Pool(config);
        this.pool.on('connect', (/*client: pg.Client*/) => {
            console.log('client connected to db');
            this.nrClients++; //should be between "min" and "max"
            console.log('nrc:', this.nrClients);
        });
        // client has an error while sitting idel
        this.pool.on('error', (err: Error) => {
            console.log(util.format('idle client error [%j]', err));
            DBAdaptor.errors.push('client error when sitting idle, error [%s] [%s]', err.message, err.stack || '');
            this.nrClients--;
        });
        this.sql = new Map();
    }

    private pool: pg.Pool;
    private nrClients: number;
    private sql: Map<SqlFileKeys, pg.QueryConfig>;
    // private userCache: Map<string, User>;
    //public methods
    get poolSize() {
        return this.nrClients;
    }

    async destroy() {
        if (!DBAdaptor.transition(ADAPTOR_STATE.Disconnecting)) {
            DBAdaptor.errors.push('Could not transition to state [disconnecting]');
            return false;
        }
        await this.pool.end();
        DBAdaptor.transition(ADAPTOR_STATE.Disconnected, true);
        return true;
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
        let errCount = 0;

        return new Promise<boolean>((resolve, reject) => {
            Object.keys(sqlFiles).forEach((key: SqlFileKeys) => {
                let fileName = path.join(__dirname, sqlFiles[key]);
                fs.readFile(fileName, { flag: 'r', encoding: 'utf8' }, (err, data) => {
                    fileCount--;
                    if (err) {
                        DBAdaptor.errors.push(util.format('Could not load sql file: %s', fileName));
                        errCount++;
                    }
                    else {
                        let qc: pg.QueryConfig = {
                            text: data,
                            name: key
                        };
                        this.sql.set(key, qc);
                    }
                    if (fileCount === 0) {
                        if (errCount > 0) {
                            return reject(false);
                        }
                        return resolve(true);
                    }
                });
            });
        });
    }


    public test() {

        this.pool.connect().then((client) => {
            client.query('select $1::text as name', ['pg-pool']).then((res) => {
                client.release();
                console.log('hello from', res.rows[0].name);
            })
                .catch((e) => {
                    client.release();
                    console.error('query error', e.message, e.stack);
                });
        });
    }

    public createUser(userName: string, email: string): Promise<number | Error> {
        /*       insert into auth.user (
           name,
           email
       )
       values (
           $1::text,
           $2::text
       )*/
        //sqlUserCreate
        let qc = this.sql.get('sqlUserCreate');
        let sqlObject = Object.assign({}, qc, { values: [userName, email] }) as pg.QueryConfig;
        //connect(callback: (err: Error, client: Client, done: () => void) => void): void;
        return new Promise<number | Error>((resolve, reject) => {
            this.pool.connect((err, client, done) => {
                if (err) {
                    return reject(err);
                }
                client.query(sqlObject)
                    .then((value) => {
                        resolve(value.rows[0]['id']);
                        done();
                    })
                    .catch((err) => {
                        reject(err);
                        done();
                    });
            });
        });
    }
}



