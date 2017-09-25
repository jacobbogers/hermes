import { expect } from 'chai';

import { AdaptorError } from '~lib/adaptors/AdaptorError';

describe('~lib/adaptors/AdaptorError', () => {
    it('Should have a #toString method', () => {
        expect(AdaptorError.prototype.toString).to.exist;
    });
    it('Should return the proper data from its #toString method', () => {
        const testWarning = new AdaptorError('This is my error message', 1);
        const expected = 'AdaptorError: (state: Initializing) This is my error message';
        expect(testWarning.toString()).to.equal(expected);
    });
    it('Should have a #getStateStr method', () => {
        expect(AdaptorError.prototype.getStateStr).to.exist;
    });
    it('Should return the proper data from its #getStateStr method', () => {
        const states = [
            'UnInitialized',
            'Initializing',
            'Initialized',
            'Connecting',
            'Connected',
            'Disconnecting',
            'Disconnected',
            'ERR_Initializing',
            'ERR_Connecting'
        ];

        for (const state in states) {
            expect(new AdaptorError('Warning', state).getStateStr()).to.equal(states[state]);
        }
    });
});
