import { expect } from 'chai';


import { AdapterMock } from '~adapters/mock/AdapterMock';

describe('AdapterMock', () => {

    const am = new AdapterMock();

    before('TearDown', async function() {
        return am.init();    
    });

    it('isConnected?', function() {
        expect(am.isConnected).to.be.true;
    });

    if ('selectBannedUsers', function(){
        const users = await am.userSelectByFilter({tokenUpdatedAfter:'1970', includeBanned:true});
    });


    after('TearDown', async function(){
        return am.shutDown();
    });

    
});
