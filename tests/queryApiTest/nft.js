const { assert } = require('./helper.js');
const helper = require('./helper.js');
const accounts = helper.ACCOUNTS;
const BN = helper.BN;
const royalties = [];
const dummyT1Authority = '0xd6ae8250b8348c94847280928c79fb3b63ca453e';

describe('Query api calls:', async () => {
  let api,user;
 
  before(async () => {
    const avnApi = await helper.avnApi({
      suri: accounts.user.seed
    });
    api = await avnApi.apis();
    user = accounts.user;
  });
  
  describe('getOwnedNfts', async () => {
    async function mint() {
      const externalRef = 'avn-gateway-test-' + new Date().toISOString();
      const requestId = await api.send.mintSingleNft(externalRef, royalties, dummyT1Authority);
      await helper.confirmStatus(api.poll, requestId, 'Processed');
      return await api.query.getNftId(externalRef);
    }

    it('returns the correct list of owned nft ids', async () => {
      let firstNftId = await mint();
      let secondNftId = await mint();
      const returnedData = await api.query.getOwnedNfts(user.address);
      // We can't be sure how many nfts are owned by `user` but we can make sure it contains the 2 we just minted
      assert(returnedData.length >= 2);
      assert(returnedData.includes(firstNftId));
      assert(returnedData.includes(secondNftId));
    });
  });

  describe('NFT data', async () => {
    let externalRef, requestId, nftId;

    describe('NFT data', async () => {
      let externalRef, nftId;

      before(async () => {
        externalRef = 'avn-gateway-test-' + new Date().toISOString();
        const requestId = await api.send.mintSingleNft(externalRef, royalties, dummyT1Authority);
        const receipt = await helper.confirmStatus(api.poll, requestId, 'Processed');
        nftId = receipt.eventArgs.nftId;
        assert(nftId != '');
      });

      it('can retrieve the NFT ID via the externalRef', async () => {
        assert(nftId, await api.query.getNftId(externalRef));
      });

      it('can retrieve the NFT nonce', async () => {
        helper.bnEquals(await api.query.getNftNonce(nftId), 0);
      });

      it('can retrieve the NFT owner via the decimal NFT ID', async () => {
        assert.equal(await api.query.getNftOwner(nftId), user.address);
      });

      it('can retrieve the NFT owner via the hex (bytes32) NFT ID', async () => {
        const bytesNftId = '0x' + new BN(nftId).toString(16);
        assert.equal(await api.query.getNftOwner(bytesNftId), user.address);
      });
    });
  });
});
