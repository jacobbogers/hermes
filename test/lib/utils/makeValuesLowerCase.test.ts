import { expect } from 'chai';

import { makeValuesLowerCase } from '~lib/utils/makeValuesLowerCase';


describe('~lib/utils/makeValuesLowerCase', () => {
    it('Should make the specified values lowercase, in a given object', () => {
        const testObj = {
            a: 'THIS IS IN ALL UPPERCASE LETTERS',
            b: 12,
            c: 'property b was a number, I sure hope it isn\'t uppercased.'
        };

        makeValuesLowerCase(testObj, 'a', 'b', 'c');

        expect(testObj.a).to.equal('this is in all uppercase letters');
        expect(testObj.b).to.equal(12);
        expect(testObj.c).to.equal('property b was a number, i sure hope it isn\'t uppercased.');
    });


    it('Shouldn\'t touch other values.', () => {
        const testObj = {
            a: 'THIS IS IN ALL UPPERCASE LETTERS',
            b: 12,
            c: 'property b was a number, I sure hope it isn\'t uppercased.'
        };

        makeValuesLowerCase(testObj, 'b');

        expect(testObj.a).to.equal('THIS IS IN ALL UPPERCASE LETTERS');
        expect(testObj.b).to.equal(12);
        expect(testObj.c).to.equal('property b was a number, I sure hope it isn\'t uppercased.');
    });
});
