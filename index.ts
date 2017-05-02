'use strict';

//import * as  express from 'express';
//import * as session from 'express-session';
//import * as bodyParser from 'body-parser';

import { DBAdaptor } from './lib/db_adaptor';

//let app = express();



// parse various different custom JSON types as JSON
//app.use(bodyParser.json({ type: 'application/*+json' }));

// parse some custom thing into a Buffer
//app.use(bodyParser.raw({ type: 'application/vnd.custom-type' }));

// parse an HTML body into a string
//app.use(bodyParser.text({ type: 'text/html' }));

//app.use(session());

DBAdaptor.create('postgresql://bookbarter:bookbarter@jacob-bogers.com:5432/bookbarter?sslmode=require')
    .then((v) => {
        console.log('db adaptor created', v);
        DBAdaptor.adaptor.test();
        DBAdaptor.adaptor.test();
        DBAdaptor.adaptor.test();
        DBAdaptor.adaptor.test();
        return true;

    })
    .catch((e) => {
        console.log('failure:', e);
        console.log(DBAdaptor.errors);
        return false;
    });

process.on('exit', () => {
    console.log('te %s', new Date().toTimeString());
});
