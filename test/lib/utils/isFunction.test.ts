import { expect } from 'chai';

import { isFunction } from '~lib/utils/isFunction';

describe('~lib/utils/isFunction', () => {
    it('Should return true if the given parameter is a function.', () => {
        const tests = [
            function foo() { return true; },
            () => 'Whatever',
            (input: any) => console.log(`You passed ${input}`),
            // tslint:disable-next-line:only-arrow-functions
            function() { return 'okay'; }
        ];

        for (const testCase of tests) {
            expect(isFunction(testCase)).to.be.true;
        }
    });
    it('Should return false if the given parameter is not a function.', () => {
        const tests = ['a string', 12, undefined, null, false, true, Infinity];

        for (const testCase of tests) {
            expect(isFunction(testCase)).to.be.false;
        }
    });
});
