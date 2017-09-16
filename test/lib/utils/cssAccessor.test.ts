import { expect } from 'chai';

import { cssAccessor } from '~lib/utils/cssAccessor';

describe('~lib/utils/cssAccessor', () => {
    it('Should retrieve the proper module name for a given css class name in a css object.', () => {
        const css = {
            main: 'asdf_01_a',
            foo: 'asdf_02_b',
            bar: 'asdf_03_c'
        };

        const styles = cssAccessor(css);

        expect(styles('main')).to.equal('asdf_01_a');
        expect(styles('foo')).to.equal('asdf_02_b');
        expect(styles('bar')).to.equal('asdf_03_c');
        expect(styles('foo', 'bar')).to.equal('asdf_02_b asdf_03_c');
        expect(styles('main', 'foo', 'bar')).to.equal('asdf_01_a asdf_02_b asdf_03_c');
    });
});
