'use strict';

//import * as  express from 'express';
//import * as session from 'express-session';
//import * as bodyParser from 'body-parser';

import {
    AdaptorPostgreSQL,
    //    TokenMessage 
} from './lib/db_adaptor_postgresql';
import { logger } from './lib/logger';
import {
    //    staticCast 
} from './lib/validation';
//let app = express();

// parse various different custom JSON types as JSON
//app.use(bodyParser.json({ type: 'application/*+json' }));

// parse some custom thing into a Buffer
//app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));

// parse an HTML body into a string
//app.use(bodyParser.text({ type: 'text/html' }));

//app.use(session());

let db = new AdaptorPostgreSQL({ url: 'postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require', sessionTemplate: 'default_cookie' });
db.init().then((v) => {
    //create services depending in the DB adaptor

    logger.trace('DBAdaptor instance created successfully.[%j]', v);
    /* 
     tokenId ?: string;
     fkUserId ?: number;
     purpose: string;
     ipAddr: string;
     tsIssuance ?: number;
     tsExpire ?: number;
     templateName: string;
     */
    /* let tm: TokenMessage = {
         fkUserId: 1,
         purpose: 'STKN', //--session-token
         ipAddr: '::',
         //tsIssuance: 0,
         //tsExpire: 10,
         templateName: 'secure_cookie'
     };
*/
    db.tokenSelectAllByFilter(0, 0, 0 /*null /*'lucifer69c6'*/).then((v2) => {
        logger.info(v2);
    }).catch((err) => {
        logger.error(err);
    });
    /*adaptor.tokenCreate(tm).then((v2) => {
        logger.warn('success object received,%j', v2);
        let t = staticCast<TokenMessage>(v2); t;
        adaptor.tokenGC(45).then((res) => {
            logger.trace('well we had success it seems %j', res);
        }).catch((err) => {
            logger.error('error object received, %j', err);
        });
    }).catch((ee) => {
        logger.error('token create error %j', ee);
    });*/
}).catch((e) => {
    console.log('failure:', e);
    console.log(db.errors);
    return false;
});


process.on('exit', () => {
    console.log('te %s', new Date().toTimeString());
});

process.on('SIGINT', () => {
    logger.warn('Caught [SIGINT] interrupt signal');
    process.exit(0);
});
