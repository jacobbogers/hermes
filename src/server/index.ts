'use strict';

import * as bodyParser from 'body-parser';
import * as  express from 'express';
import * as session from 'express-session';
import * as path from 'path';

import { registerAuth } from '~lib/registerAuth';
import { SystemInfo } from '~system';

import {
    AdaptorPostgreSQL as Adaptor
} from '~adaptors/postgres';

import {
    // AdaptorMock as Adaptor
} from '~adaptors/mock';

import { Logger } from '~lib/logger';

const logger = Logger.getLogger();

import {
    IHermesStoreProperties
} from '~hermes-props';

import { HermesStore } from '~lib/HermesStore';

/* init */
/* init */

SystemInfo.createSystemInfo({ maxErrors: 5000, maxWarnings: 5000 });

const app = express();

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
    limit: '100kb'
}));

const adaptor = new Adaptor({
    url: 'postgresql://bookbarter:bookbarter@jacob-bogers.com:443/bookbarter?sslmode=allow'
});

const props: IHermesStoreProperties = {
    defaultCookieOptionsName: 'default_cookie',
    adaptor
};


const hermesStore = new HermesStore(props);
hermesStore.once('connect', () => {

    logger.info('store is initialized');

    init();

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


    app.get(/.*/, (req, res) => {
       req;
       res.set({'Content-Type': 'text/html'});
       res.sendfile(path.resolve('dist/client/index.html'));
    });

}

process.on('exit', () => {
    console.log('te %s', new Date().toTimeString());
});

process.on('SIGINT', () => {
    logger.warn('Caught [SIGINT] interrupt signal');
    adaptor.shutDown().then(() => process.exit(0));
});
