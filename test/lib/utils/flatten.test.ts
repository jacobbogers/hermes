import { expect } from 'chai';

import { flatten } from '~lib/utils/flatten';

describe('lib/utils/flatten', () => {
    it('Should flatten an object, given it is an array', () => {
        expect(flatten([1, [2, [3]]])).to.deep.equal([1, 2, 3]);
    });
});
