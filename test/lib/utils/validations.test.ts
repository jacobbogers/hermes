import { expect } from 'chai';
import * as sinon from 'sinon';

import {
    ifEmptyString,
    ifInvalidPortString,
    ifNull,
    ifUndefined,
    validationFactory
} from '~lib/utils/validations';

describe('~lib/utils/validations', () => {
    describe('Validations', () => {

        it('Should perform the appropriate tasks for each validation function.', () => {
            const tests = [
                {
                    fn: ifEmptyString,
                    valid: '',
                    invalid: ['a string', 12, true, false, undefined, () => 'hello', null]
                },
                {
                    fn: ifInvalidPortString,
                    valid: -50,
                    invalid: [8080]
                },
                {
                    fn: ifNull,
                    valid: null,
                    invalid: ['a string', 12, true, false, undefined, () => 'hello']
                },
                {
                    fn: ifUndefined,
                    valid: undefined,
                    invalid: ['a string', 12, true, false, null, () => 'hello']
                }
            ];

            for (const testCase of tests) {
                const testFN = sinon.spy((val: any) => {
                    expect(val).to.be.a('String');
                    expect(val).to.equal('Hello World');
                });

                testCase.fn(testFN, testCase.valid, 'Hello', 'World');
                expect(testFN.called).to.be.true;
                expect(testFN.calledOnce).to.be.true;
                expect(testFN.calledWith('Hello World')).to.be.true;

                testFN.reset();

                for (const invalidValue of testCase.invalid) {
                    testCase.fn(testFN, invalidValue, 'Hello', 'World');
                }
                expect(testFN.called).to.be.false;
                expect(testFN.calledOnce).to.be.false;
                expect(testFN.calledWith('Hello World')).to.be.false;
            }
        });
    });
});
