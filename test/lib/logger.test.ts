import { expect } from 'chai';

import { Logger } from '~lib/logger';

describe('~lib/logger', () => {
    describe('#getLogger', () => {
        it('Should exist as a static method on Logger', () => {
            expect(Logger.getLogger).to.exist;
            expect(Logger.getLogger).to.be.a('function');
        });
        it('Should return a new instance of Logger if Logger.tracer does not exist.', () => {
            const logger = Logger.getLogger();
            expect(logger).to.be.an.instanceOf(Logger);
            expect(logger.debug).to.exist;
            expect(logger.debug).to.be.a('function');
            expect(logger.error).to.exist;
            expect(logger.error).to.be.a('function');
            expect(logger.info).to.exist;
            expect(logger.info).to.be.a('function');
            expect(logger.log).to.exist;
            expect(logger.log).to.be.a('function');
            expect(logger.trace).to.exist;
            expect(logger.trace).to.be.a('function');
            expect(logger.warn).to.exist;
            expect(logger.warn).to.be.a('function');
        });
        it('Should recycle an already-existing instance of Logger', () => {
            const testLogger = Logger.getLogger();
        });
    });
});
