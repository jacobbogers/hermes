// Vendor

import { CookieOptions } from 'express';
import { Store } from 'express-session';

/* how to use this store;
 * create first; and connect to express -session; object
 * the express - session; object; default sets; the; internal;  'storeReady'; to; true, on; creation, make; sure; this; is; turned; off
 *
*/ 

const defer = (func) => process.nextTick(func, 0);
const dud = () => {};


export class HermesStore extends Store {

  public constructor() {
   super();

    // why would express-session emit a 'disconnect' event on the store?
    //* disconnect event added by express-session inner workings*/
    this.once('newListener', (event: string, listener: () => void) => {
      if (event === 'disconnect') { // why wo
        //why call it immediatly?
        //if (!this.adaptor.connected) {
          listener();
        //}
      }
    });
    // TODO, fire off initialisation of adaptor,
    
    /*
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
        const errors = _si.systemErrors(null, Error);
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
    }*/
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

  /**
   * Get number of active sessions.
   *
   * @param {function} callback
   * @public
   */

 
  /* users */
  /* users */
  /* users */


}

