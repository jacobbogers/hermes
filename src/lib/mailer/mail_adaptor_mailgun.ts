'use strict';

import {EventEmitter} from 'events';

import Logger from '../logger';
const logger = Logger.getLogger();
logger;
//import { load } from './email_templates';

export class EmailMailGunAdaptor extends EventEmitter {
    private constructor() {
        super();
    }
}


