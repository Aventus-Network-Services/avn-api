const assert = require('chai').assert;
const helper = require('../helper');
const accounts = helper.ACCOUNTS;

describe('Query api calls:', async () => {
  let api, user, newUser;

  before(async () => {
    const avnApi = await helper.avnApi({
      suri: accounts.user.seed
    });
    api = await avnApi.apis();
    user = accounts.user;
    newUser = avnApi.accountUtils.generateNewAccount();
    token = helper.token;
  });

  describe('getOutstandingLowersForAccount', async () => {
    it('returns data', async () => {
      const ethDevAddress = '0xDE7E1091cDE63c05Aa4D82C62e4C54eDbC701B22';
      const returnedData = await api.query.getOutstandingLowersForAccount(ethDevAddress);
      assert(Array.isArray(returnedData.lowerData));
      assert(returnedData.status === 'success');
    });
  });

  describe('getAvtBalance', async () => {
    it('returns correct avt balance for specific user by address', async () => {
      helper.bnEquals(await api.query.getAvtBalance(newUser.address), 0);
    });
    it('returns correct avt balance for specific user by publicKey', async () => {
      helper.bnEquals(await api.query.getAvtBalance(newUser.publicKey), 0);
    });
  });

  describe('getTokenBalance', async () => {
    it('returns correct token balance for specific user by address', async () => {
      helper.bnEquals(await api.query.getTokenBalance(newUser.address, token), 0);
    });
    it('returns correct token balance for specific user by publicKey', async () => {
      helper.bnEquals(await api.query.getTokenBalance(newUser.publicKey, token), 0);
    });
  });
});
