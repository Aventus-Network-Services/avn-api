# Quick Start

## Access
Any account wishing to access the AvN gateway must initially hold a minimum 1 AVT

## Accounts
Accounts can be imported or generated by the API\
An account can then be assigned by:
- setting the `AVN_SURI` environment variable, eg: \
`export AVN_SURI=0x816ef9f2c7f9e8c013fd5fca220a1bf23ff2f3b268f8bcd94d4b5df96534173f`\
`set AVN_SURI="history mule trend shove lawsuit spray fall tongue patient social ribbon tooth"`
- passing the suri to the constructor
- calling the `setSURI` method in the API

_**Note:** Always keep your mnemonic/seed safe and private. If compromised you could lose all your account's funds._

## Install

```shell
$ npm i avn-api
```

## Basic Usage

```javascript
const AvnApi = require('avn-api');

// The AvN gateway endpoint, as supplied by Aventus:
const AVN_GATEWAY_URL = 'https://...';

// The AvN address of the relayer you will be using, as supplied by Aventus:
const AVN_RELAYER = '5Ekag...';

// The Ethereum address of the Authority required for minting NFTs, as supplied by Aventus:
const AVN_AUTHORITY = '0xD3372...';

async function main() {
  const options = { suri: '0x816ef9f2c7f9e8c013fd5fca220a1bf23ff2f3b268f8bcd94d4b5df96534173f'};
  const api = new AvnApi(AVN_GATEWAY_URL, options);
  // If no URL is passed the API will run in offline mode, exposing core utilities:
  // const api = new AvnApi(); // OR:
  // const api = new AvnApi(null, options);
  await api.init();

  // Return your account's address:
  const MY_ADDRESS = api.utils.myAddress();

  // Get various Aventus contract addresses:
  console.log('AVT token:', await api.query.getAvtContractAddress());
  console.log('AVN tier1:', await api.query.getAvnContractAddress());
  console.log('NFT listings:', await api.query.getNftContractAddress());

  // Get the total amount of AVT held on the AvN:
  console.log(await api.query.getTotalAvt());

  // Get the AVT balance of an AvN account:
  console.log(await api.query.getAvtBalance(MY_ADDRESS));

  // Get the AVT fees a relayer charges for processing transactions:
  console.log(await api.query.getRelayerFees(AVN_RELAYER)); // default fees for any user
  console.log(await api.query.getRelayerFees(AVN_RELAYER, MY_ADDRESS)); // user specific fees
  console.log(await api.query.getRelayerFees(AVN_RELAYER, MY_ADDRESS, 'proxyTokenTransfer')); // for a specific transaction type

  // ******* TOKEN OPERATIONS *******
  // Get the ERC-20 or ERC-777 token balance of an account:
  const someAccount = '5Gc8PokrcM6BsRPhJ63oHAiZhdm1L26wg7iekBE1FMbaUBde';
  const someToken = '0x3B00Ef435fA4FcFF5C209a37d1f3dcff37c705aD';
  console.log(await api.query.getTokenBalance(someAccount, someToken));

  // Transfer one AVT (AvN accounts can be supplied as either address or public key):
  const recipientPublicKey = '0xc8e823c9e91db0c829ee8da22f883f6f0eaeae026a598057a552d59865ba9e29';
  const avtAmount = '1000000000000000000';
  let requestId = await api.send.transferAvt(AVN_RELAYER, recipientPublicKey, avtAmount);

  // Poll the status of the AVT transfer:
  await confirmTransaction(api, requestId);

  // Transfer two 18dp ERC-20 or ERC-777 tokens:
  const tokenAmount = '2000000000000000000';  
  requestId = await api.send.transferToken(AVN_RELAYER, recipientPublicKey, someToken, tokenAmount);
  await confirmTransaction(api, requestId);

  // Confirm a lift of tokens from layer 1:
  const ethereumTransactionHashForLift = '0x64fb8991712d7fafec06610103dd207338c125ad126b310654711461b2378f64';
  requestId = await api.send.confirmLift(AVN_RELAYER, ethereumTransactionHashForLift);
  await confirmTransaction(api, requestId);

  // Lower three tokens to layer 1:
  const recipientEthereumAddress = '0xfA2Fafc874336F12C80E89e72c8C499cCaba7a46';
  const lowerAmount = '3000000000000000000';
  requestId = await api.send.lowerToken(AVN_RELAYER, recipientEthereumAddress, someToken, lowerAmount);
  await confirmTransaction(api, requestId);

  // ******* NFT OPERATIONS *******
  // Get all the NFTs currently owned by an account:
  console.log(await api.query.getOwnedNfts(MY_ADDRESS));

  // Mint a new NFT with royalties:
  const externalRef = 'my-unique-nft' + new Date().toISOString();
  const primaryRoyaltyRecipientEthereumAddress = '0xFf5b32E6CaA7bB4C5716bC9119a908dDA4AF224B';
  const secondaryRoyaltyRecipientEthereumAddress = '0xAcb816F1dB1324e90be79Ac589762a5A6DAfb99E';
  const royalties = [
    {
      recipient_t1_address: primaryRoyaltyRecipientEthereumAddress,
      rate: {
        parts_per_million: 50000 // 5%
      }
    },
    {
      recipient_t1_address: secondaryRoyaltyRecipientEthereumAddress,
      rate: {
        parts_per_million: 20000 // 2%
      }
    }
  ];
  requestId = await api.send.mintSingleNft(AVN_RELAYER, externalRef, royalties, AVN_AUTHORITY);
  await confirmTransaction(api, requestId);

  // Get the ID of the freshly minted NFT:
  let nftId = await api.query.getNftId(externalRef);

  // List the NFT for sale in fiat:
  requestId = await api.send.listFiatNftForSale(AVN_RELAYER, nftId);
  await confirmTransaction(api, requestId);

  // Transfer a sold NFT:
  requestId = await api.send.transferFiatNft(AVN_RELAYER, recipientPublicKey, nftId);
  await confirmTransaction(api, requestId);
  console.log(await api.query.getNftOwner(nftId)); // Confirm the new owner

  // Or cancel the listing:
  requestId = await api.send.cancelFiatNftListing(AVN_RELAYER, nftId);
  await confirmTransaction(api, requestId);

  // ******* STAKING OPERATIONS *******
  // Get an account's staking information:
  console.log(await api.query.getAccountInfo(MY_ADDRESS));

  // See the AvN's current staking statistics (eg: total staked, average staked):
  console.log(await api.query.getStakingStats());

  // Stake one AVT (locks up an amount of stake to begin earning rewards):
  const amountToStake = '1000000000000000000';
  requestId = await api.send.stake(AVN_RELAYER, amountToStake);
  await confirmTransaction(api, requestId);

  // Collect any rewards due (pays out the next 250 unpaid stakers for the staking era - callable until that era is emptied):
  let era = await api.query.getActiveEra();
  let previousEra = era - 1;
  requestId = await api.send.payoutStakers(AVN_RELAYER, previousEra); // era is optional, if left the latest active era is used
  await confirmTransaction(api, requestId);

  // Unstake half an AVT (unstaked funds no longer accrue rewards and are unlocked after a period of 7 days):
  const amountToUnstake = '500000000000000000';
  requestId = await api.send.unstake(AVN_RELAYER, amountToUnstake);
  await confirmTransaction(api, requestId);

  // Withdraws all previously unlocked AVT back to the user's free AVT balance:
  requestId = await api.send.withdrawUnlocked(AVN_RELAYER);
  await confirmTransaction(api, requestId);

  // ******* ACCOUNT OPERATIONS *******
  // Generate a new AvN account (account generation is local and will also work offline):
  const newAccount = api.utils.generateNewAccount();
  console.log(newAccount);

  // Set the new account as the api user (also works offline):
  api.setSURI(newAccount.seed);
  // Get its address and public key (seed and mnemonic are not stored and cannot be returned)
  console.log(api.utils.myAddress(), api.utils.myPublicKey());
}

(async () => await main())()

// Helper function wrapping the API transaction polling:
async function confirmTransaction(api, requestId) {
  for (i = 0; i < 10; i++) {
    await sleep(3000);
    // Poll transaction status by request ID:
    const polledState = await api.poll.requestState(requestId);
    if (polledState.status === 'Processed') {
      console.log('Transaction processed');
      break;
    } else if (status === 'Rejected') {
      console.log('Transaction failed');
      break;
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

```

## Further information
Check the [docs](https://aventus-network-services.github.io/avn-gateway-docs/)