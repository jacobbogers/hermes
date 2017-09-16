import { expect } from 'chai';
import { OperationResult } from '~lib/utils/OperationResult';

describe('~lib/utils/OperationResult', () => {
    const testProps = {
        collected: ['a', 'b', 'c'],
        deleted: 3,
        errors: 4,
        inserted: 2
    };

    describe('#collected', () => {

        it('Should return the list of collected items, if OperationResult is given items', () => {
            const testCase = new OperationResult({...testProps});

            expect(testCase.collected).to.eql(['a', 'b', 'c']);
            expect(testCase.collected.length).to.eql(3);
        });

        it('Should return undefined if OperationResult is not given items', () => {
            const testCase = new OperationResult({...testProps, collected: undefined});
            expect(testCase.collected).to.be.undefined;
        });
    });

    describe('#errors', () => {

        it('Should return the number of errors in OperationResult', () => {
            const testCase = new OperationResult({...testProps});
            expect(testCase.errors).to.equal(4);
        });
    });

    describe('#first', () => {

        it('Should return the first item in this.collected', () => {
            const testCase = new OperationResult({...testProps});
            expect(testCase.first).to.equal('a');

            const newerCase = new OperationResult({...testProps, collected: [1, 2, 3]});
            expect(newerCase.first).to.equal(1);
        });
    });

    describe('#inserted', () => {

        it('Should return the number of insertions in OperationResult', () => {
            const testCase = new OperationResult({...testProps});
            expect(testCase.inserted).to.equal(2);
        });
    });
});
