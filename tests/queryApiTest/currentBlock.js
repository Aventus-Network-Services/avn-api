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

  describe('getCurrentBlock', async () => {
    it('returns the current block', async () => {
      let currentBlock = await api.query.getCurrentBlock();
      assert(parseInt(currentBlock) > 0);
    });
  });
});
