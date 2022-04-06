# Quick Start

## Prerequisites
To use the AvN gateway you must hold a minimum 1 AVT in your AvN account. Set this account's mnemonic or secret seed as the "SURI" environment variable, eg: \
`export SURI=history mule trend shove lawsuit spray fall tongue patient social ribbon tooth` \
`export SURI=0x816ef9f2c7f9e8c013fd5fca220a1bf23ff2f3b268f8bcd94d4b5df96534173f`

**Note:** Keep your mnemonic/seed secret and never expose it elsewhere. If compromised you could lose all your account's funds.

## Install

```shell
$ npm i avn-api
```

## Basic Usage

```javascript
const AvnApi = require('avn-api');

// The AvN gateway endpoint, as supplied by Aventus:
const AVN_GATEWAY_URL = 'https://testnet.gateway.aventus.io';

// The AvN address of the relayer you will be using, as supplied by Aventus:
const AVN_RELAYER = '5EkagVbzi1wjADSL5S4YPY8ELpNdPgJRuJPQMgER2SuDCDkN';

// The Ethereum address of the Authority required for minting NFTs, as supplied by Aventus:
const AVN_AUTHORITY = '0xD33727EEB7ecEe217e8292Fe96C489d8D04cae8F';

// The AvN address of the account set as SURI in your environment:
const MY_ACCOUNT = '5FTZCCeUux5fo1F3vZh45kk3cMc7Qu3KqsRkFMig1KoJ9pdk';


async function main() {
  const api = new AvnApi(AVN_GATEWAY_URL); // If no URL is passed API will run in offline mode, exposing just its core utilities
  await api.init();

  // Generate a new AvN account (account generation is local and also works offline)
  console.log(api.utils.generateNewAccount());

  // Get the total amount of AVT held on the AvN
  console.log(await api.query.getTotalAvt());

  // Get the AVT balance of an AvN account
  console.log(await api.query.getAvtBalance(MY_ACCOUNT));

  // Get the AVT fees a relayer charges for processing transactions
  console.log(await api.query.getRelayerFees(AVN_RELAYER)); // default fees for any user
  console.log(await api.query.getRelayerFees(AVN_RELAYER, MY_ACCOUNT)); // user specific fees
  console.log(await api.query.getRelayerFees(AVN_RELAYER, MY_ACCOUNT, 'proxyTokenTransfer')); // for a specific transaction type

  // Get the ERC-20 or ERC-777 token balance of an account
  const someAccount = '5Gc8PokrcM6BsRPhJ63oHAiZhdm1L26wg7iekBE1FMbaUBde';
  const someToken = '0x3B00Ef435fA4FcFF5C209a37d1f3dcff37c705aD';
  console.log(await api.query.getTokenBalance(someAccount, someToken));

  // Transfer some AVT (AvN accounts can be supplied as either addresses or public keys)
  const recipientPublicKey = '0xc8e823c9e91db0c829ee8da22f883f6f0eaeae026a598057a552d59865ba9e29';
  const avtAmount = '100';
  let requestId = await api.send.transferAvt(AVN_RELAYER, recipientPublicKey, avtAmount);

  // Poll the status of the AVT transfer
  await pollTransactionStatus(api, requestId);

  // Transfer some ERC-20 or ERC-777 tokens
  const tokenAmount = '200';  
  requestId = await api.send.transferToken(AVN_RELAYER, recipientPublicKey, someToken, tokenAmount);
  await pollTransactionStatus(api, requestId);

  // Confirm a lift of tokens from layer 1
  const ethereumTransactionHashForLift = '0x64fb8991712d7fafec06610103dd207338c125ad126b310654711461b2378f64';
  requestId = await api.send.confirmLift(AVN_RELAYER, ethereumTransactionHashForLift);
  await pollTransactionStatus(api, requestId);

  // Lower some tokens to layer1
  const recipientEthereumAddress = '0xfA2Fafc874336F12C80E89e72c8C499cCaba7a46';
  const lowerAmount = '300';
  requestId = await api.send.lowerToken(AVN_RELAYER, recipientEthereumAddress, someToken, lowerAmount);
  await pollTransactionStatus(api, requestId);

  // ***** NFT operations *****
  // Mint a new NFT with royalties
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
  await pollTransactionStatus(api, requestId);

  // Get the ID of the freshly minted NFT
  let nftId = await api.query.getNftId(externalRef);

  // List the NFT for sale in fiat
  requestId = await api.send.listFiatNftForSale(AVN_RELAYER, nftId);
  await pollTransactionStatus(api, requestId);

  // Transfer a sold NFT
  requestId = await api.send.transferFiatNft(AVN_RELAYER, recipientPublicKey, nftId);
  await pollTransactionStatus(api, requestId);

  // Or cancel the listing
  requestId = await api.send.cancelFiatNftListing(AVN_RELAYER, nftId);
  await pollTransactionStatus(api, requestId);

  // ***** Staking operations *****
  // Get the staker's staking account information
  console.log(await api.query.getAccountInfo(MY_ACCOUNT));

  // Stake 1 AVT (locks up an amount of stake to begin earning rewards)
  const amountToStake = '1000000000000000000';
  requestId = await api.send.stake(AVN_RELAYER, amountToStake);
  await pollTransactionStatus(api, requestId);

  // Collect any rewards due (pays out the next 250 unpaid stakers for the staking era - callable until that era is emptied)
  let era = await api.query.getActiveEra();
  let previousEra = era - 1;
  requestId = await api.send.payoutStakers(AVN_RELAYER, previousEra); // era is optional, if left the latest active era is used
  await pollTransactionStatus(api, requestId);

  // Unstake half an AVT (unstaked funds no longer accrue rewards and are unlocked after a period of time)
  const amountToUnstake = '500000000000000000';
  requestId = await api.send.unstake(AVN_RELAYER, amountToUnstake);
  await pollTransactionStatus(api, requestId);

  // Withdraws all previously unlocked AVT back to the user's free AVT balance
  requestId = await api.send.withdrawUnlocked(AVN_RELAYER);
  await pollTransactionStatus(api, requestId);
}

(async () => await main())()


async function pollTransactionStatus(api, requestId) {
  for (i = 0; i < 10; i++) {
    await sleep(3000);
    const status = (await api.poll.requestState(requestId)).status;
    if (status === 'Processed') {
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
