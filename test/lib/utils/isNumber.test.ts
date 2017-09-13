import { expect } from 'chai';

import { isNumber } from '~lib/utils/isNumber';

describe('~lib/utils/isNumber', () => {
    it('Should return true if the given parameter is a finite number.', () => {
        const testCases = [
            0,
            2e64,
            0x11,
            0b11,
            0o11,
            Number.MAX_VALUE,
            Number.MIN_VALUE
        ];

        for (const testCase of testCases) {
            expect(isNumber(testCase)).to.be.true;
        }
    });

    it('Should return false if the given parameter is not a finite number.', () => {
        const testCases = [
            null,
            undefined,
            +Infinity,
            -Infinity,
            'Hello World!',
            '0',
            { an: 'Object' },
            ['an', 'Object']
        ];

        for (const testCase of testCases) {
            expect(isNumber(testCase)).to.be.false;
        }
    });
});
