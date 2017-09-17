import { expect } from 'chai';

import { deepClone } from '~lib/utils/deepClone';

describe('~lib/utils/deepClone', () => {
    it('Should successfully deep clone an object', () => {
        interface IUser {
            [key: string]: any;
            address: { city: string; country: string };
            age: number;
            enemies: string[];
            friends: string[];
            name: string;
        }

        // tslint:disable:object-literal-sort-keys
        const original: IUser = {
            name: 'Chris',
            address: {
                city: 'Atlanta',
                country: 'United States'
            },
            age: 20,
            enemies: [],
            friends: ['Santa', 'Easter Bunny', 'Cupid']
        };
        // tslint:enable:object-literal-sort-keys

        const copy: IUser = deepClone(original);

        expect(copy).to.deep.equal(original);
        expect(copy).to.not.equal(original);

        for (const key in original) {
            if (original.hasOwnProperty(key)) {
                delete original[key];
            }
        }

        expect(original).to.eql({});
        expect(copy).to.not.eql({});
    });

    it('Should successfully deep clone an array', () => {
        const original: number[] = [1, 2, 3, 4, 5];
        const copy: number[] = deepClone(original);

        expect(copy)
            .to.eql(original)
            .but.not.equal(original);

        while (original.length) original.pop();

        expect(original).to.eql([]);
        expect(copy).to.eql([1, 2, 3, 4, 5]);
    });
});
