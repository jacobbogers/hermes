import { expect } from 'chai';

import { makeObjectNull } from '~lib/utils/makeObjectNull';

describe('~lib/utils/makeObjectNull', () => {
    it('Should make all `undefined` fields `null` in the given object', () => {
        // tslint:disable:object-literal-sort-keys
        const tests = [
            {
                anotherField: 'string',
                aNumber: 12,
                thisIsNull: null,
                thisIsUndefined: undefined
            },
            {
                all: undefined,
                of: undefined,
                these: undefined,
                fields: undefined,
                are: undefined,
                undef: undefined
            }
        ];

        const expected = [
            {
                anotherField: 'string',
                aNumber: 12,
                thisIsNull: null,
                thisIsUndefined: null
            },
            {
                all: null,
                of: null,
                these: null,
                fields: null,
                are: null,
                undef: null
            }
        ];
        // tslint:enable:object-literal-sort-keys

        for (const i in tests) {
            makeObjectNull(tests[i]);
            expect(tests[i]).to.eql(expected[i]);
        }

    });
    it('Should not touch other fields', () => {
        // tslint:disable:object-literal-sort-keys
        const tests = [
            {
                aString: 'string',
                aNumber: 12
            },
            {
                anArray: ['Hello', 'World'],
                anObject: { goodbye: 'World' }
            }
        ];

        const expected = [
            {
                aString: 'string',
                aNumber: 12
            },
            {
                anArray: ['Hello', 'World'],
                anObject: { goodbye: 'World' }
            }
        ];
        // tslint:enable:object-literal-sort-keys

        for (const i in tests) {
            makeObjectNull(tests[i]);
            expect(tests[i]).to.eql(expected[i]);
        }
    });
});
