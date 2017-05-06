
import { Store } from 'express-session';
import { AdaptorBase } from './db_adaptor_base';
import { logger } from './logger';


export interface SessionHash {
    [sid: string]: Express.Session;

}


/**
 * how to use this store;
 * create first and connect to express-session object
 * the express-session object default sets the internal  "storeReady" to true, on creation, make sure this is turned off
 *  
 */

export interface HermesStoreProperties {

    adaptor: AdaptorBase; // assign to with subclass of new AdaptorBase(...)  
}

export class HermesStore extends Store {

    private adaptor: AdaptorBase;

    constructor(options: HermesStoreProperties) {
        super(options);
        // the express-session object default sets the internal  "storeReady" to true, on creation, make sure this is turned off.
        // this will ensure that the store will disable the middleware by default.
        this.adaptor = options.adaptor;
        this.once('newListener', (event: string, listener: () => void) => {
            if (event === 'disconnect') {
                if (!this.adaptor.isConnected) {
                    listener();
                }
            }
        });
        //TODO, fire off initialisation of adaptor,
        this.adaptor.init().then((ok) => {
            logger.trace('DBAdaptor instance created successfully.[%s]', ok ? 'true' : 'false');
            this.adaptor.emit('connect');
        }).catch(() => {
            logger.error('Failure to initialze adaptor: %j', this.adaptor.errors);
            this.adaptor.emit('disconnect');
        });

        this.adaptor.once('connect', () => {
            this.emit('connect');
        });
        this.adaptor.once('disconnect', () => {
            this.emit('disconnect');
        });
        if (this.adaptor.isConnected) {
            this.adaptor.emit('connect');
        }

    }

	/*  regenerate (req: express.Request, fn: (err: any) => any): void;
      load (sid: string, fn: (err: any, session: Express.Session) => any): void;
      createSession (req: express.Request, sess: Express.Session): void;
      
      get: (sid: string, callback: (err: any, session: Express.Session) => void) => void;
      set: (sid: string, session: Express.Session, callback: (err: any) => void) => void;
      destroy: (sid: string, callback: (err: any) => void) => void;
      all: (callback: (err: any, obj: { [sid: string]: Express.Session; }) => void) => void;
      length: (callback: (err: any, length: number) => void) => void;
      clear: (callback: (err: any) => void) => void;
    }
    public*/

    public all = (callback: (err: any, obj: SessionHash) => void) => {

        let v: SessionHash = {};

        // 
        //

        callback && callback(null, v);
    }



}







