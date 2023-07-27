# Quick Start

## Install

```shell
$ npm i avn-api
```

## Access
Any account wishing to access the AvN gateway must initially hold a minimum of 1 AVT. Once a transaction has been sent sucessfully, the minimum balance restriction will be removed.

## Usage
This SDK can be used in 2 modes as defined in the `SetupMode` enum:
 - Single user mode (default): In this mode, the SDK acts as a single account wallet.
 - Multi user mode: In this mode, multiple users can use the same instance of the SDK to interact with the Avn gateway.

 To set one of these mode, pass in the following options when creating an instance of the SDK
 ```
 import { AvnApi, SetupMode } from 'avn-api';

 const singleUserSdk = new AvnApi( { setupMode : SetupMode.SingleUser } ) // OR
 const multiUserSdk = new AvnApi( { setupMode : SetupMode.MultiUser } )

 ```

### Signing
There are 2 options to choose from when configuring the signing behaviour of the SDK:
 - Suri based signer (default): In this mode, the user must set their `SURI` either via an environment variable or as part of the options (see `Accounts` below). This SURI will be used to sign messages such as AWT tokens or transactions. **This is only applicable in single user mode**.
 - Remote signer: In this mode, the caller will set a function that will be called by the SDK when it requires a signature. The SDK will not have access to the signer's SURI. This option can be selected for *single user* and *multi user* modes.

 To set one of these mode, pass in the following options when creating an instance of the sdk
 ```
 import { AvnApi, SigningMode } from 'avn-api';

 const suriBasedSdk = new AvnApi( { signingMode: SigningMode.SuriBased } ) // OR
 const remoteSignerSdk = new AvnApi( { signingMode: SigningMode.RemoteSigner } )
 ```

### Nonce caching
Part of the sdk functionality is to send transactions via the AvN gateway to the AvN parachain. These transactions require various nonces to be specified to ensure they are safe from replay attacks. This SDK supports 2 types of nonce caching:
- Local cache (default): this is an in-memory cache attached to the single instance of the sdk. This setup **is not recommended** if there are multiple instances of the SDK processing the same user requests. Example: a multi pod setup running multiple backends for the same frontend application.
- Remote cache: this allows the user to specify a remote cache [via an INonceCacheProvider interface](./lib/caching/interfaces.ts) enabling multiple separate intances of the SDK to access the same nonce storage. If this mode is selected, a `cacheProvider` must be specified in the options. Please see [this provider](./lib/caching/inMemoryNonceCacheProvider.ts) to get started on how to implement one.

To set one of these modes, pass in the following options when creating an instance of the SDK
 ```
 import { AvnApi, NonceCacheType } from 'avn-api';

 const localNonceCacheSdk = new AvnApi( { nonceCacheType: NonceCacheType.Local } ) // OR

 const remoteNonceCacheSdk = new AvnApi( {
    nonceCacheType: NonceCacheType.Remote,
    cacheProvider: testCacheProvider
 })
 ```

### Accounts
Accounts can be imported or generated by the API\
In *Suri based signing mode*, an account can then be assigned by any of the following:
- setting the `AVN_SURI` environment variable, eg: \
`export AVN_SURI=0x816ef9f2c7f9e8c013fd5fca220a1bf23ff2f3b268f8bcd94d4b5df96534173f`\
`set AVN_SURI="history mule trend shove lawsuit spray fall tongue patient social ribbon tooth"`
- passing the suri to the constructor

_**Note:** Always keep your mnemonic/seed safe and private. If compromised you could lose all your account's funds._

## Basic Usage

```javascript
const {AvnApi, SetupMode, SigningMode, NonceCacheType} = require('avn-api');

// The AvN gateway endpoint:
const AVN_GATEWAY_URL = 'https://...';

// The AvN address of the payer you will be using:
const PAYER = '5G7B3...';

// The Ethereum address of an Authority required for minting NFTs, as supplied by Aventus:
const AVN_AUTHORITY = '0xD3372...';

// The address associated with the suri
const USER_ADDRESS = '5B4C9...'

async function main() {
  // ******* OPTIONS *******
  // By default, the sdk will run in SingleUser mode with a SuriBased signer and Local nonce cache so we only need to set a SURI.
  const options = {
    suri: '0x816ef9f2c7f9e8c013fd5fca220a1bf23ff2f3b268f8bcd94d4b5df96534173f'
  };

  // For split fee functionality we can specify the payer in the options object.
  const splitFeeOptions = {
    suri: '0x816ef9f2c7f9e8c013fd5fca220a1bf23ff2f3b268f8bcd94d4b5df96534173f', payerAddress: PAYER
  };

  // If a default payer account is added we can simply set the hasPayer flag to true.
  const defaultSplitFeeOptions = {
    suri: '0x816ef9f2c7f9e8c013fd5fca220a1bf23ff2f3b268f8bcd94d4b5df96534173f', hasPayer: true
  };

  // Relayer defaults to Aventus if none is passed
  const relayerOptions = {
    suri: '0x816ef9f2c7f9e8c013fd5fca220a1bf23ff2f3b268f8bcd94d4b5df96534173f',
    relayer: '5FgyN...'
  };

  // Single user setup with a remote cache
  const multiUserOptions = {
    suri: '0x816...',
    relayer: relayer,
    setupMode : SetupMode.SingleUser,
    signingMode: SigningMode.SuriBased,
    nonceCacheOptions: {
      nonceCacheType: NonceCacheType.Remote,
      cacheProvider: *remoteCacheProvider*,
      sameUserNonceDelayMs: 100,
    },

  }

  /* Multi user setup with a remote signer and remote cache */

  // A remote signer and a user can be passed in instead of a suri.
  // This function must be able to sign and return a signature
  async function signData(encodedDataToSign, signerAddress) {
    // Example:
    //   Make an http call to a KMS to sign encodedData using signerAccount
    //   and return the signature
  }

  const remoteSignerOptions = {
        sign: (data, signerAddress) => signData(data, signerAddress),
        address: signerAccount
  }

  const multiUserOptions = {
    signer: remoteSignerOptions,
    relayer: relayer,
    setupMode : SetupMode.MultiUser,
    signingMode: SigningMode.RemoteSigner,
    nonceCacheOptions: {
      nonceCacheType: NonceCacheType.Remote,
      cacheProvider: testCacheProvider,
      sameUserNonceDelayMs: 100,
    },
  }

  // ******* API SETUP *******
  const avnSdk = new AvnApi(AVN_GATEWAY_URL, options);
  const splitFeesApi = new AvnApi(AVN_GATEWAY_URL, splitFeeOptions);
  const defaultSplitFeesApi = new AvnApi(AVN_GATEWAY_URL, defaultSplitFeeOptions);
  // If no URL is passed the API will run in offline mode, exposing core utilities:
  // const api = new AvnApi(); // OR:
  // const api = new AvnApi(null, options);
  await avnSdk.init();

  // View API version, gateway (if connected), and all available top level functions and properties:
  console.log(avnSdk);

  // Return your account's address:
  const MY_ADDRESS = avnSdk.myAddress();

  // In a Single user, Suri based signing setup, you can get access to the apis provided by the SDK without specifying a user address.
  // `userAddress` is ommited because the sdk can calculate it based on the SURI
  const api = await avnSdk.apis()
  // In a Remote signing setup, to get access to the apis provided by the SDK, you have to pass in a user address.
  //This user will be the signer for any transactions or token generated.
  const api = await avnSdk.apis(USER_ADDRESS)

  // View all the public endpoint you can call on the AvN blockchain via the apis:
  console.log(api);

  // Get information about the connected chain:
  console.log(await api.query.getChainInfo());

  // Get the chain's latest finalized block number:
  console.log(await api.query.getCurrentBlock());

  // Get various Aventus contract addresses:
  console.log('AVT token:', await api.query.getAvtContractAddress());
  console.log('AVN tier1:', await api.query.getAvnContractAddress());
  console.log('NFT listings:', await api.query.getNftContractAddress());

  // Get the total amount of AVT held on the AvN:
  console.log(await api.query.getTotalAvt());

  // Get the AVT balance of an AvN account:
  console.log(await api.query.getAvtBalance(MY_ADDRESS));

  // Get the AVT fees a relayer charges for processing transactions:
  const relayer = api.relayer; // get the relayer currently being used
  console.log(await api.query.getRelayerFees(relayer)); // default fees for any user
  console.log(await api.query.getRelayerFees(relayer, MY_ADDRESS)); // user specific fees
  console.log(await api.query.getRelayerFees(relayer, MY_ADDRESS, 'proxyTokenTransfer')); // for a specific transaction type

  // ******* TOKEN OPERATIONS *******
  const someAccount = '5Gc8PokrcM6BsRPhJ63oHAiZhdm1L26wg7iekBE1FMbaUBde';
  const someToken = '0x3B00Ef435fA4FcFF5C209a37d1f3dcff37c705aD';
  const PSUEDO_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

  // Get the total amount of a token currently locked in the AvN:
  console.log('Total ETH:', await api.query.getTotalToken(PSUEDO_ETH_ADDRESS));
  console.log('Total Some Token:', await api.query.getTotalToken(someToken));

  // Get the ERC-20 or ERC-777 token balance of an account:
  console.log(await api.query.getTokenBalance(someAccount, someToken));

  // Transfer one AVT (AvN accounts can be supplied as either address or public key):
  const recipientPublicKey = '0xc8e823c9e91db0c829ee8da22f883f6f0eaeae026a598057a552d59865ba9e29';
  const avtAmount = '1000000000000000000';
  let requestId = await api.send.transferAvt(recipientPublicKey, avtAmount);

  // Poll the status of the AVT transfer:
  await confirmTransaction(api.poll, requestId);

  // Transfer two 18dp ERC-20 or ERC-777 tokens:
  const tokenAmount = '2000000000000000000';
  requestId = await api.send.transferToken(recipientPublicKey, someToken, tokenAmount);
  await confirmTransaction(api.poll, requestId);

  // Lower three tokens to layer 1:
  const recipientEthereumAddress = '0xfA2Fafc874336F12C80E89e72c8C499cCaba7a46';
  const lowerAmount = '3000000000000000000';
  requestId = await api.send.lowerToken(recipientEthereumAddress, someToken, lowerAmount);
  const transactionInfo = await confirmTransaction(api.poll, requestId);

  // Get all available lowers and the data to complete them
  // by Ethereum recipient address:
  console.log(await await api.query.getOutstandingLowersForAccount(recipientEthereumAddress));
  // or by AvN sender public key:
  console.log(await await api.query.getOutstandingLowersForAccount(publicKey));

  // ******* NFT OPERATIONS *******

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
  requestId = await api.send.mintSingleNft(externalRef, royalties, AVN_AUTHORITY);
  await confirmTransaction(api.poll, requestId);

  // Get the ID of the freshly minted NFT:
  let nftId = await api.query.getNftId(externalRef);

  // List the NFT for sale in fiat:
  requestId = await api.send.listFiatNftForSale(nftId);
  await confirmTransaction(api.poll, requestId);

  // Transfer a sold NFT:
  requestId = await api.send.transferFiatNft(recipientPublicKey, nftId);
  await confirmTransaction(api.poll, requestId);
  console.log(await api.query.getNftOwner(nftId)); // Confirm the new owner

  // Or cancel the listing:
  requestId = await api.send.cancelFiatNftListing(nftId);
  await confirmTransaction(api.poll, requestId);

  // ******* BATCH NFT OPERATIONS *******
  // Create nft batch
  const totalSupply = 5; // number of nfts available to mint in this batch
  requestId = await api.send.createNftBatch(totalSupply, royalties, AVN_AUTHORITY);
  await confirmTransaction(api.poll, requestId);

  // Mint Batch nft
  const index = 1; // Index of the nft within the batch
  const owner = '5G7B3...'; // New owner address
  const batchId = "batch_id"; // string representing the batch Id
  requestId = await api.send.mintBatchNft(batchId, index, owner, externalRef);
  await confirmTransaction(api.poll, requestId);

  // List Fiat nft Batch for sale
  requestId = await api.send.listFiatNftBatchForSale(batchId);
  await confirmTransaction(api.poll, requestId);

  // End nft Batch sale
  requestId = await api.send.endNftBatchSale(batchId);
  await confirmTransaction(api.poll, requestId);

  // ******* STAKING OPERATIONS *******
  // Get an account's staking information:
  console.log(await api.query.getAccountInfo(MY_ADDRESS));

  // See the AvN's current staking statistics (eg: total staked, average staked):
  console.log(await api.query.getStakingStats());

  // Stake one AVT (locks up an amount of stake to begin earning rewards):
  const amountToStake = '1000000000000000000';
  requestId = await api.send.stake(amountToStake);
  await confirmTransaction(api.poll, requestId);

  // See the amount of staking rewards earned over all time:
  console.log(await api.query.getStakerRewardsEarned(MY_ADDRESS));
  // Or during a period of time:
  const fromTimestamp = 1672531200; // 1st Jan 2023
  const toTimestamp = 	1685574000; // 1st Jun 2023
  console.log(await api.query.getStakerRewardsEarned(api.myPublicKey(), fromTimestamp, toTimestamp));

  // Unstake half an AVT (unstaked funds no longer accrue rewards and are unlocked after a period of 7 days):
  const amountToUnstake = '500000000000000000';
  requestId = await api.send.unstake(amountToUnstake);
  await confirmTransaction(api.poll, requestId);

  // Withdraws all previously unlocked AVT back to the user's free AVT balance:
  requestId = await api.send.withdrawUnlocked();
  await confirmTransaction(api.poll, requestId);

  // ******* ACCOUNT OPERATIONS *******
  // Generate a new AvN account (account generation is local and will also work offline):
  const newAccount = api.accountUtils.generateNewAccount();
  console.log(newAccount);

  // ******* CACHED NONCES *******
  // View current token nonce
  const nonceData = api.proxyNonce(USER_ADDRESS, 'token')
  console.log(nonceData);
}

(async () => await main())()

// Helper function wrapping the API transaction polling:
async function confirmTransaction(apiPoller, requestId) {
  for (i = 0; i < 10; i++) {
    await sleep(3000);
    // Poll transaction status by request ID:
    let polledState = await apiPoller.requestState(requestId);
    if (polledState.status === 'Processed') {
      console.log('Transaction processed');
      return polledState;
    } else if (polledState.status === 'Rejected') {
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
