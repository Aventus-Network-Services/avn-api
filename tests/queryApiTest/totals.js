const assert = require('chai').assert;
const helper = require('../helper.js');
const accounts = helper.ACCOUNTS;
const BN = helper.BN;
const BN_ZERO = new BN(0);

describe('Query api calls:', async () => {
  let api, token;
  before(async () => {
    
     const avnApi = await helper.avnApi({
      suri: accounts.user.seed
    });
     api = await avnApi.apis();
     token = helper.token;
    
  });


  describe('get totals', async () => {
    it('returns total AVT', async () => {
      //let avt = await api.query.getAvtContractAddress();
      assert(new BN(await api.query.getTotalAvt()).gt(BN_ZERO));
    });

    it('returns total other token', async () => {
      assert(
        new BN(await api.query.getTotalToken(token)).gt(BN_ZERO),
        `The total token balance for ${token} should be greater than 0`
      );
    });

    it('returns zero for a non-existent token', async () => {
      const nonExistentToken = '0xd09a7B5F603E66B04e8DaFCD8653114f3C49C038';
      helper.bnEquals(await api.query.getTotalToken(nonExistentToken), 0);
    });
  });

});


