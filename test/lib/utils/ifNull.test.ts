import { expect } from 'chai';

import { ifNull } from '~lib/utils/ifNull';

describe('~lib/utils/ifNull', () => {
    it('Should execute the first argument with the 3rd..nth argument if the 2nd argument is null.', () => {
        const add = (...nums: number[]) => nums.reduce((a, b) => a + b);
        expect(ifNull(add, null, 1, 2, 3, 4)).to.equal(10);
    });
});
