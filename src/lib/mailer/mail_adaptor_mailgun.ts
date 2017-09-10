'use strict';

import { EventEmitter } from 'events';

import { Logger } from '../logger';
const logger = Logger.getLogger();

export class EmailMailGunAdaptor extends EventEmitter {
    private constructor() {
        super();
    }
}

