import { expect } from 'chai';

import { isNumber } from '~lib/utils/isNumber';

describe('~lib/utils/isNumber', () => {
    it('Should return true if the given parameter is a finite number.', () => {
        expect(isNumber(0)).to.be.true;
        expect(isNumber(2e64)).to.be.true;
        expect(isNumber(0x11)).to.be.true;
        expect(isNumber(0b11)).to.be.true;
        expect(isNumber(0o11)).to.be.true;
        expect(isNumber(Number.MAX_VALUE)).to.be.true;
        expect(isNumber(Number.MIN_VALUE)).to.be.true;
    });
    it('Should return false if the given parameter is not a finite number.', () => {
        expect(isNumber(null)).to.be.false;
        expect(isNumber(undefined)).to.be.false;
        expect(isNumber(+Infinity)).to.be.false;
        expect(isNumber(-Infinity)).to.be.false;
        expect(isNumber('Hello World!')).to.be.false;
        expect(isNumber('0')).to.be.false;
        expect(isNumber({ an: 'Object' })).to.be.false;
        expect(isNumber([ 'an', 'Object' ])).to.be.false;
    });
});
