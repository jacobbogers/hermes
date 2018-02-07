'use strict';

import * as BlueBird from 'bluebird';
import * as chai from 'chai';
import { expect } from 'chai';
import * as cas from 'chai-as-promised';
import { omit } from 'lodash';
import * as moment from 'moment';

const fixture = require('./fixture.json');

chai.use(cas);

import { AdapterMock } from '~adapters/mock/AdapterMock';

describe('AdapterMock', () => {
  

    function stripDates<T>(o: T): Partial<T> {
        return omit(o, ['created', 'expire', 'lastUpdated']);
    }

    const anonUserId = '0000-0000-0000-0000';

    const uids = [
        '61e1c14e-5125-43e4-a0f7-55f5882ce298',
        '72476bd3-d63b-4376-bd65-887b7d148b91',
        '9281aafd-e7d5-4e89-9ae8-3248c3df4d6e',
        'd9a6bffc-fc0a-4a2a-842d-211704c723bd',
        'b5710ec1-b983-466c-9728-8ddd0258f7e2',
        '2354c48d-d5e1-47e0-9cca-1d5fae9796a0',
        '7676250c-f253-4f67-bde7-eb121679679a',
        '939d0314-2852-4789-847a-5a26fbcace01',
        '697c0b59-f450-4c4b-9bfe-ccf93277e9e3',
        '3cd08a14-b4cb-4a3b-ab60-bcdab142a9cc'];

    const am = new AdapterMock();

    before('StartUp', async function() {
        return am.init();
    });

    it('isConnected?', function() {
        expect(am.isConnected).to.be.true;
    });

    it('selectBannedUsers + users last update after 1970(all)', function() {
        const users = am.userSelectByFilter({ tokenUpdatedAfter: '1970', includeBanned: true });
        return expect(users).to.eventually.deep.equal([{
            id: '23',
            name: 'jacobot',
            email: 'email',
            lastUpdated: '20180201134510',
            created: '20180201134510'
        }]);
    });

    it('create token for web-client tracking, test defaults', async function() {
        const na = moment().toISOString();
        const n10a = moment(na).add(10, 'years').toISOString();

        const result = await am.tokenUpsert({
            id: uids[0],
            userId: '', //will set default anonymous
            purpose: 'web',
            ip: '2001:0:5ef5:79fb:8f3:1114:f588:80e3',
            revoked: '',
            revokeReason: '',
            expire: '', // never expire (kinda)
            template: '', // will set default 'hermes'
            lastUpdated: '', // will set default now.toISOString(),
            created: '' //will set default now.toISOString()
        });
        // test the dates
        const nb = moment().toISOString();
        const n10b = moment(nb).add(10, 'years').toISOString();

        const d10big = moment(n10b).diff(n10a);
        const dbig = moment(nb).diff(na);

        const d10small = moment(n10b).diff(result.expire);
        const dsmall = moment(nb).diff(result.lastUpdated);

        chai.assert(d10small <= d10big, `default expire [${result.expire}] date is not valid`);
        chai.assert(dsmall <= dbig, `default expire [${result.lastUpdated}] date is not valid`);

        return expect(stripDates(result)).to.deep.equal({
            id: '61e1c14e-5125-43e4-a0f7-55f5882ce298',
            ip: '2001:0:5ef5:79fb:8f3:1114:f588:80e3',
            purpose: 'web',
            revoked: '',
            revokeReason: '',
            template: 'hermes',
            userId: '0000-0000-0000-0000'
        });
    });

    it('fetch token from db default inserted', async function() {
        const result = BlueBird.map(am.tokenSelectAll(), t => stripDates(t));
        expect(result).eventually.to.deep.equal([{
            id: '61e1c14e-5125-43e4-a0f7-55f5882ce298',
            ip: '2001:0:5ef5:79fb:8f3:1114:f588:80e3',
            purpose: 'web',
            revoked: '',
            revokeReason: '',
            template: 'hermes',
            userId: '0000-0000-0000-0000'
        }]);
    });

    it('fetch token with default inserts, by token id', async function(){
        const result = stripDates( await am.tokenSelectById(uids[0]));
        return expect(result).to.deep.equal({
            id: '61e1c14e-5125-43e4-a0f7-55f5882ce298',
            ip: '2001:0:5ef5:79fb:8f3:1114:f588:80e3',
            purpose: 'web',
            revoked: '',
            revokeReason: '',
            template: 'hermes',
            userId: '0000-0000-0000-0000'
        });
    });


    after('TearDown', async function() {
        return am.shutDown();
    });

});





/* const allTokens = am.tokenSelectAll();
 return expect(allTokens).to.eventually.deep.equal([{
     id: uids[0],
     userId: anonUserId, //anonymous
     purpose: 'web',
     ip: '2001:0:5ef5:79fb:8f3:1114:f588:80e3',
     revoked: '',
     revokeReason: '',
     expire: nowPlus10years, // never expire (kinda)
     template: 'hermes',
     lastUpdated: now,
     created: now
 }]);*/







