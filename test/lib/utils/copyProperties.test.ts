import { expect } from 'chai';

import { copyProperties } from '~lib/utils/copyProperties';

describe('~lib/utils/copyProperties', () => {
    it('Should copy the properties from <source> to <target>, given the properties exist in both', () => {
        const source = { a: 'b', c: 'd' };
        const target = { c: 'e', f: 'g' };
        copyProperties(target, source);

        expect(target.c).to.equal(source.c);
    });
    it('Should not touch properties that do not exist in both', () => {
        const source = {a: 'b', c: 'd'};
        const target = {c: 'e', f: 'g'};
        copyProperties(target, source);

        expect(target.c).to.equal(source.c);
        expect(source.a).to.equal('b');
        expect(target.f).to.equal('g');
    });

    it('Shouldn\'t do anything if <source> and <target> share no properties', () => {
        const source = {a: 'b', c: 'd'};
        const target = {e: 'f', g: 'h'};
        copyProperties(target, source);

        expect(source).to.eql({ a: 'b', c: 'd' });
        expect(target).to.eql({ e: 'f', g: 'h' });
    });
});
