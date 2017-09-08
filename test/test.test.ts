import { expect } from 'chai';

async function whatever() {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(true), 1000);
        setTimeout(() => reject(false), 3000);
    });
}

describe('A testing test', () => {
    it('Should resolve true after 1000ms', async() => {
        const result = await whatever();
        expect(result).to.be.true;
    });
});
