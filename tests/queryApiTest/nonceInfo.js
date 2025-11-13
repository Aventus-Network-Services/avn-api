const assert = require('chai').assert;
const helper = require('../helper.js');
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
  });

  describe('getNonce', async () => {
    it('returns the same token nonce by address as by public key', async () => {
      const nonce = await api.query.getUserNonce(user.address, 'token');
      assert.equal(nonce, await api.query.getUserNonce(user.publicKey, 'token'));
    });

    it('returns the same payment nonce by address as by public key', async () => {
      const nonce = await api.query.getUserNonce(user.address, 'payment');
      assert.equal(nonce, await api.query.getUserNonce(user.publicKey, 'payment'));
    });

    it('returns the same staking nonce by address as by public key', async () => {
      const nonce = await api.query.getUserNonce(user.address, 'staking');
      assert.equal(nonce, await api.query.getUserNonce(user.publicKey, 'staking'));
    });

    it('returns the same confirmation nonce by address as by public key', async () => {
      const nonce = await api.query.getUserNonce(user.address, 'confirmation');
      assert.equal(nonce, await api.query.getUserNonce(user.publicKey, 'confirmation'));
    });
  });

  describe('getNonce', async () => {
    it('returns correct account nonce for specific user by address', async () => {
      helper.bnEquals(await api.query.getUserNonce(newUser.address, 'token'), 0);
    });
    it('returns correct account nonce for specific user by publicKey', async () => {
      helper.bnEquals(await api.query.getUserNonce(newUser.publicKey, 'token'), 0);
    });
  });
});
