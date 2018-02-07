import { expect } from 'chai';


import { AdaptorMock } from '~adaptors/mock/AdaptorMock';

describe('AdaptorMock', () => {

    const am = new AdaptorMock();

    before('some before text', async function() {
        await am.init();
        
    });

    it('isConnected?', function() {
        expect(am.isConnected).to.be.true;
    });

    
});
