'use strict';

//import * as  express from 'express';
//import * as session from 'express-session';
//import * as bodyParser from 'body-parser';

import { DBAdaptor } from './lib/db_adaptor';
import { logger } from './lib/logger';
//let app = express();

// parse various different custom JSON types as JSON
//app.use(bodyParser.json({ type: 'application/*+json' }));

// parse some custom thing into a Buffer
//app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));

// parse an HTML body into a string
//app.use(bodyParser.text({ type: 'text/html' }));

//app.use(session());
let adaptor: DBAdaptor;

DBAdaptor.create('postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require')
    .then((v) => {
        //create services depending in the DB adaptor
        adaptor = DBAdaptor.adaptor;

        logger.trace('DBAdaptor instance created successfully.[%j]', v);
        //adaptor.userCreate('lucifer69c6', 'vdwingbats@gmail.com')
        adaptor.userSelectAllBlackListed().then((v2) => {

            logger.info('nr of props returned is %d , some data here:%j', v2.length, v2.slice(0, 10));
        }).catch((err) => {
            logger.error('some error , during massive fetch %j', err);
        });
    })
    /*Promise.resolve(7)
        .then((userId) => {
            logger.info('User creation success %j', userId);
            adaptor.userAddProperty(userId, 'ZIpCode', 'L1313').then((v2) => {
                logger.info('userAddProperty success, resolves to %j', v2);

            }).catch((err) => {
                logger.error('userAddProperty failed to %s', err);
            });
            adaptor.userRemoveProperty(userId, 'phoneNr').then((v2) => {
                logger.info('userRemoveProperty success, resolves to %j', v2);

            }).catch((err) => {
                logger.error('userRemoveProperty failed to %s', err);
            });
        })
        .catch((err) => {
            logger.error('User creation failure %j', err);
            Object.keys(err).forEach((key) => {
                logger.error('%s->%j', key, err[key]);
            });
        });
    return true;
})*/
    .catch((e) => {
        console.log('failure:', e);
        console.log(DBAdaptor.errors);
        return false;
    });

process.on('exit', () => {
    console.log('te %s', new Date().toTimeString());
});


process.on('SIGINT', () => {
    logger.warn('Caught [SIGINT] interrupt signal');
    process.exit(0);
});

