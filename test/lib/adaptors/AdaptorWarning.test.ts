import { expect } from 'chai';

import { AdaptorError } from '~lib/adaptors/AdaptorError';
import { AdaptorWarning } from '~lib/adaptors/AdaptorWarning';

describe('~lib/adaptors/AdaptorWarning', () => {
    it('Should extend AdaptorError', () => {
        expect(AdaptorError.isPrototypeOf(AdaptorWarning)).to.be.true;
    });
    it('Should have a #toString method', () => {
        expect(AdaptorWarning.prototype.toString).to.exist;
    });
    it('Should return the proper data from its #toString method', () => {
        const testWarning = new AdaptorWarning('This is my error message', 1);
        const expected = 'AdaptorWarning: (state: Initializing) This is my error message';
        expect(testWarning.toString()).to.equal(expected);
    });
    it('Should have a #getStateStr method', () => {
        expect(AdaptorWarning.prototype.getStateStr).to.exist;
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
            expect(new AdaptorWarning('Warning', state).getStateStr()).to.equal(states[state]);
        }
    });
});
