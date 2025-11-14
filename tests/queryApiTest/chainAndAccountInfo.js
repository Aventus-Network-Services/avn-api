const assert = require('chai').assert;
const helper = require('../helper.js');
const accounts = helper.ACCOUNTS;

describe('Query api calls:', async () => {
  let api, user;

  before(async () => {
    const avnApi = await helper.avnApi({
      suri: accounts.user.seed
    });
    api = await avnApi.apis();
    user = accounts.user;
  });

  describe('getChainInfo', async () => {
    it('can get the current chain information', async () => {
      let chainInfo = await api.query.getChainInfo();
      assert(chainInfo.hasOwnProperty('name'));
      assert(chainInfo.hasOwnProperty('version'));
      assert(chainInfo.hasOwnProperty('avtContract'));
      assert(chainInfo.hasOwnProperty('avnContract'));
    });
  });

  describe('AccountInfo', async () => {
    it('returns correct data for user by address', async () => {
      const returnedData = await api.query.getAccountInfo(user.address);
      assert(returnedData.freeBalance);
      assert(returnedData.totalBalance);
    });
  });
});
