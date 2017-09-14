import { expect } from 'chai';

import { flattenMerge } from '~lib/utils/flatten';

describe('~lib/utils/flatten', () => {
    it('Should flatten an object, given it is an array', () => {
        const input = [
            [1, [2, [3]]],
            ['a', 'b', ['c', ['d', ['e', ['f', [[['g']]]]]]]],
            [{ a: 'This', b: 'is' }, [{ c: 'an', d: 'object' }]]
        ];
        const output = [
            [1, 2, 3],
            ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
            [{ a: 'This', b: 'is' }, { c: 'an', d: 'object' }]
        ];

        for (let i = 0; i < input.length; i++) {
            expect(flattenMerge(input[i])).to.deep.equal(output[i]);
        }
    });
});
