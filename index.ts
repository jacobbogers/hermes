'use strict';

import * as  express from 'express';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';

import {
    AdaptorPostgreSQL,
} from './lib/db_adaptor_postgresql';

import { logger } from './lib/logger';


import {
    HermesStore,
    HermesStoreProperties
} from './lib/hermes_store';

/* init */
/* init */
/* init */


let app = express();
app.use(
    bodyParser.json({
        type: 'application/*+json',
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
    adaptor: new AdaptorPostgreSQL({
        url: 'postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require'
    })
};


let hermesStore = new HermesStore(props);
hermesStore.once('connect', () => {

    logger.info('store is initialized');
    init();
    app.listen(8080, () => {
        logger.warn('app is listening on 8080');
    });


});

function init() {

    app.use(session({
        /**secret: string;
          name?: string;
          store?: Store | MemoryStore;
          cookie?: express.CookieOptions;
          genid?: (req: express.Request) => string;
          rolling?: boolean;
          resave?: boolean;
          proxy?: boolean;
          saveUninitialized?: boolean;
          unset?: string; */
        secret: 'the fox jumps over the lazy dog',
        name: 'hermes.id',
        store: hermesStore,
        saveUninitialized: true,
        resave: false,
        rolling: true,
        unset: 'keep',
        cookie: hermesStore.getDefaultTemplate()
    }));
    app.get('/', (req, res, next) => {
        req;
        next;
        res.set({ 'Contet-Type': 'text/html' });
        /*if (req.session) {
            let cnt = Number.parseInt(req.session['counter']);
            if (cnt === undefined) {
                cnt = 7;
            }
            cnt = (cnt > 0) ? --cnt : 7;
            req.session['counter'] = '' + cnt;
        }*/
        if (req.session && !req.session._user) {
            req.session.save((err) => {
                if (err) {
                    return next(err);
                }
                logger.warn('session looks like %j', req.session);
                res.send('Response:' + new Date());
            });
            return;
        }
        logger.info('session looks like %j', req.session);
        res.send('Response:' + new Date());

    });
}

process.on('exit', () => {
    console.log('te %s', new Date().toTimeString());
});

process.on('SIGINT', () => {
    logger.warn('Caught [SIGINT] interrupt signal');
    process.exit(0);
});
