'use strict';

import * as  express from 'express';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';
import * as path from 'path';
import { GraphQLOptions } from 'graphql-server-core';
import { graphqlExpress, graphiqlExpress } from 'graphql-server-express';
import { makeExecutableSchema } from 'graphql-tools';
import { SystemInfo } from '../lib/system';
import { staticCast } from '../lib/utils';

import {
    AdaptorPostgreSQL,
} from '../lib/db_adaptor_postgresql';

import { logger } from '../lib/logger';


import {

    HermesStore,
    HermesStoreProperties,
    UserProperties,
    TokenProperties

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
    adaptor: new AdaptorPostgreSQL({
        url: 'postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require'
    })
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

    let typeDefs = [
        `
        # Your User Information
        type User {
            # some more comments
            name: String
            email: String
            expire: String
        }

        type Query {
             # Get the current authenticated user
             currentUser: User
        }

        type Mutation {
            login(email:String, password:String ): User
        }

        
        schema {
            query: Query
            mutation: Mutation
        }
        `
    ];

    let resolvers = {
        Query: {
            currentUser(obj: any, args: any, context: any, info: any) {
                info;
                obj;
                args;
                Array.from(arguments).forEach((itm, idx) => {
                    logger.info('%d. type:%s', idx + 1, typeof itm);
                });
                let req = context.req as Express.Request;
                logger.info('number of arguments: %d', Array.from(arguments).length);
                logger.info('sessioID %s', req.sessionID);
                logger.info('session %j', req.session);

                if (req.session) {
                    let tokenProps = staticCast<TokenProperties>(req.session._hermes);
                    let userProps = staticCast<UserProperties>(req.session._user);
                    return { name: userProps.name, email: userProps.email, expire: new Date(tokenProps.tsExpire).toString() };
                }  //{ sessionID: sid, sessionStore: self };

                return {};
            }
        },
        Mutation: {
            login(obj: any, args: any, context: any, info: any) {
                logger.info('number of arguments in (login): %d', Array.from(arguments).length);
                obj;
                args;
                context;
                info;
                logger.info('args: %j', args);
                //logger.info('info:%j', info);
                //Array.from(arguments).forEach((itm, idx) => {
                //    logger.info('%d. type:%s', idx + 1, typeof itm);
                //});

                return {};
            }
        }
    };

    let schema = makeExecutableSchema({ typeDefs, resolvers });

    const graphQLOptions: GraphQLOptions = {
        schema: schema,
        // values to be used as context and rootValue in resolvers
        // context?: any,
        // rootValue?: any,
        // function used to format errors before returning them to clients
        //formatError?: Function,
        // additional validation rules to be applied to client-specified queries
        ///validationRules?: Array < ValidationRule >,
        // function applied for each query in a batch to format parameters before passing them to `runQuery`
        //formatParams?: Function,
        // function applied to each response before returning data to clients
        //formatResponse?: Function,
        // a boolean option that will trigger additional debug logging if execution errors occur
        debug: true
    };

    app.use('/graphql', graphqlExpress((req?: Express.Request, resp?: Express.Response) => {
        return Object.assign({}, graphQLOptions, { context: { req, resp } }) as GraphQLOptions;
    }));

    app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));


    /* fake middleware */
    app.use((req, res, next) => {

        req;
        next;
        let session = req.session;
        res.set({ 'Content-Type': 'text/html' });
        if (session && (!session._user || !session._hermes)) {
            logger.error('session save called');
            session.save((err) => {
                if (err) {
                    return next(err);
                }
                logger.info('session looks like %j', req.session);
                /*res.send('Response:' + new Date());*/
                next();
            });
            return;
        }
        logger.info('setting some props');
        if (session) {
            session['COUNTRY'] = 'LU'; // = 'HENNY';
            session['FIRST_NAME'] = 'HENRY';
            session['CITY'] = 'VILLE';
            let user = session._user as UserProperties;
            user.id = undefined;
            user.email = undefined;
            user.name = 'lucifer696';
            user.userProps = { LAST_NAME: 'Bovors', AUTH: 'admin', BLACKLISTED: '' };
        }
        logger.info('session looks like %j', req.session);
        next();
        //res.send('Response:' + new Date());
    });

    app.use('/', express.static(path.resolve('dist/client')));

}

process.on('exit', () => {
    console.log('te %s', new Date().toTimeString());
});

process.on('SIGINT', () => {
    logger.warn('Caught [SIGINT] interrupt signal');
    process.exit(0);
});
