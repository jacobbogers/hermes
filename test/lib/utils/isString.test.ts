import { expect } from 'chai';

import { isString } from '~lib/utils/isString';

describe('~lib/utils/isString', () => {


    it('Should return true if the given parameter is a string', () => {
        const testCases = [
            'Hello World!',
            'null',
            'undefined',
            '0',
            '12',
            '2e4',
            'bar => bar',
            '{ this: "is an object!" }'
        ];

        for (const testCase of testCases) {
            expect(isString(testCase)).to.be.true;
        }
    });


    it('Should return false if the given parameter is not a string', () => {
        const testCases = [
            null,
            undefined,
            0,
            12,
            2e4,
            (bar: any) => bar,
            { this: 'is an object!' }
        ];

        for (const testCase of testCases) {
            expect(isString(testCase)).to.be.false;
        }
    });
});
