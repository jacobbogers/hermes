import { expect } from 'chai';


import { AdapterMock } from '~adaptors/mock/AdapterMock';

describe('AdapterMock', () => {

    const am = new AdapterMock();

    before('some before text', async function() {
        await am.init();
        
    });

    it('isConnected?', function() {
        expect(am.isConnected).to.be.true;
    });

    
});
