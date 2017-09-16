import { expect } from 'chai';

import { flatMap } from '~lib/utils/flatMap';

describe('~lib/utils/flatMap', () => {
    it('Should flatten a 1D Map.', () => {
        const testMap = new Map();
        testMap.set('a', 'b');
        testMap.set('c', 'd');
        testMap.set('e', 'f');

        expect(flatMap(testMap)).to.eql(['b', 'd', 'f']);
    });

    it('Should flatten a 2D Map.', () => {
        const testMap = new Map();
        testMap.set('a', 'b');
        testMap.set('c', 'd');
        testMap.set('e', 'f');

        const nestedMap = new Map();
        nestedMap.set('g', 'h');
        nestedMap.set('i', 'j');
        nestedMap.set('k', 'l');
        testMap.set('nestedMap', nestedMap);

        expect(flatMap(testMap)).to.eql(['b', 'd', 'f', 'h', 'j', 'l']);
    });

    it('Should flatten a n-dimensional Map.', () => {
        const nums: any[] = [];
        for (let i = 0; i < 1000; i++) nums.push(i);

        const testCase = nums.reduce((a, b) =>
            new Map([[b, a], ['val', b]]), new Map());

        expect(flatMap(testCase)).to.eql(nums);
    });
});
