import { expect } from 'chai';

import { flatten } from '~lib/utils/flatten';

describe('lib/utils/flatten', () => {
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
            expect(flatten(input[i])).to.deep.equal(output[i]);
        }
    });

    it('Should throw a TypeError when provided invalid arguments', () => {
        expect(flatten).to.throw(TypeError, 'Invalid Type');

        const testTypes = ['string', 1, undefined, null];

        for (const item of testTypes) {
            expect(() => flatten(item)).to.throw(TypeError, 'Invalid Type');
        }
    });
});
