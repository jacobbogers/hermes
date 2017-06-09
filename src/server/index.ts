'use strict';

import * as  express from 'express';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';
import * as path from 'path';

import { SystemInfo } from '../lib/system';
import { registerAuth } from '../lib/authentication';

import {
    //AdaptorPostgreSQL,
} from '../lib/db_adaptor_postgresql';

import {
    AdaptorMock
} from '../lib/db_adaptor_mock';

import Logger from '../lib/logger';

const logger = Logger.getLogger();

import {
    HermesStore,
    HermesStoreProperties,
} from '../lib/hermes_store';

/* init */
/* init */

SystemInfo.createSystemInfo({ maxErrors: 5000, maxWarnings: 5000 });

let app = express();

app.use(
    bodyParser.json({
        /*type: 'application/*+json',*/
        inflate: true,
        limit: '100kb',
        strict: true,
        verify: (req, buf, encoding) => {
            req;
            buf;
            encoding;
        }
    })
);

app.use(
    bodyParser.urlencoded({
        type: 'application/x-www-form-urlencoded',
        extended: true,
        inflate: true,
        parameterLimit: 1000,
        limit: '100kb',
        verify: (req, buf, encoding) => {
            req;
            buf;
            encoding;
        }
    })
);

app.use(
    bodyParser.text({
        type: 'text/html',
        defaultCharset: 'utf-8',
        inflate: true,
        limit: '100kb',
        verify: (req, buf, encoding) => {
            req;
            buf;
            encoding;
        }
    })
);

app.use(bodyParser.raw({
    type: 'application/vnd.custom-type',
    inflate: true,
    limit: '100kb',
}));

let props: HermesStoreProperties = {
    defaultCookieOptionsName: 'default_cookie',
    adaptor: new AdaptorMock()
    /*adaptor: new AdaptorPostgreSQL({
        url: 'postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require'
    })*/
};


let hermesStore = new HermesStore(props);
hermesStore.once('connect', () => {

    logger.info('store is initialized');

    true && init();

    app.listen(8080, () => {
        logger.warn('app is listening on 8080');
    });

});

function init() {

    app.use(session({
        secret: 'the fox jumps over the lazy dog',
        name: 'hermes.id',
        store: hermesStore,
        saveUninitialized: false,
        resave: false,
        rolling: false,
        unset: 'destroy',
        cookie: hermesStore.getDefaultCookieOptions()
    }));

    /* fake middleware */
    registerAuth({ graphQL_url: '/graphql' }, app);

    app.use('/', express.static(path.resolve('dist/client')));

}

process.on('exit', () => {
    console.log('te %s', new Date().toTimeString());
});

process.on('SIGINT', () => {
    logger.warn('Caught [SIGINT] interrupt signal');
    process.exit(0);
});
