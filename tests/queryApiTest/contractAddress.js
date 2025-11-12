const assert = require('chai').assert;
const helper = require('../helper.js');
const accounts = helper.ACCOUNTS;

describe('Query api calls:', async () => {
  let api;

  before(async () => {
    const avnApi = await helper.avnApi({
      suri: accounts.user.seed
    });
    api = await avnApi.apis();
  });

  describe('get contract addresses', async () => {
    it('getAvtContractAddress', async () => {
      assert((await api.query.getAvtContractAddress()).length == 42);
    });
    it('getAvnContractAddress', async () => {
      assert((await api.query.getAvnContractAddress()).length == 42);
    });
    it('getNftContractAddress', async () => {
      const result = await api.query.getNftContractAddress();
      if (result.length > 0) {
        // Because some chains dont have nft contracts
        assert(result[0].length == 42);
      }
    });
  });
});
