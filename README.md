# Quick Start

## Prerequisites
Before running the API you must have an account on the AvN holding a minimum 100 AVT. Set this account's mnemonic or secret seed as the "SURI" environment variable:
```
export SURI=<mnemonic OR secret seed>
```
examples: \
`export SURI=caution juice atom organ advance problem want pledge someone senior holiday very` \
`export SURI=0xc8fa03532fb22ee1f7f6908b9c02b4e72483f0dbd66e4cd456b8f34c6230b849`

**Note:** It is important to keep the mnemonic/seed safe and never expose it elsewhere. If this data is compromised you could lose all your account's funds.

## Install

```shell
$ npm i avn-api
```

## Basic Usage

```javascript
const AvnApi = require('avn-api')

// The AvN gateway endpoint, as supplied by Aventus:
const AVN_GATEWAY_ENDPOINT = 'https://xyz...'

// The AvN address of the relayer you will be using, as supplied by Aventus:
const AVN_RELAYER = '5FbUQ...'

// The Authority required for minting NFTs, as supplied by Aventus:
const AVN_AUTHORITY = '0xab01...'

// The AvN address of the account set as SURI in your environment:
const MY_ACCOUNT = '5Gv8Y...'


async function main() {
  const api = new AvnApi(AVN_GATEWAY_ENDPOINT)
  await api.init()

  // Generate a new AvN account (local generation of keypair only)
  console.log(api.utils.generateNewAccount())

  // Get the current total AVT supply of the AvN
  console.log(await api.query.getTotalAvt())

  // Get the AVT balance of an account
  console.log(await api.query.getAvtBalance(MY_ACCOUNT))

  // Get the current AVT fees a relayer charges for proxying transactions
  console.log(await api.query.getRelayerFees(AVN_RELAYER)) // default
  console.log(await api.query.getRelayerFees(AVN_RELAYER, MY_ACCOUNT)) // user specific

  // Get the ERC-20/ERC-777 token balance of an account
  const someOtherAccount = '5DAgx...'
  const token = '0x7e5bb...'
  console.log(await api.query.getTokenBalance(someOtherAccount, token))

  // Transfer some AVT
  const sender = MY_ACCOUNT
  const recipient = someOtherAccount
  const amount = '100'
  let requestId = await api.send.transferAvt(AVN_RELAYER, sender, recipient, amount)

  // Poll on the status of the AVT transfer
  await pollTransactionStatus(api, requestId)

  // Transfer some ERC-20/ERC-777 tokens  
  requestId = await api.send.transferToken(AVN_RELAYER, sender, recipient, token, amount)
  await pollTransactionStatus(api, requestId)

  // Mint an NFT with royalties
  const externalRef = 'my-unique-nft' + new Date().toISOString()
  const royalties = [
    {
      recipient_t1_address: '0xf8f77...',
      rate: {
        parts_per_million: 10000
      }
    },
    {
      recipient_t1_address: '0xE566A...',
      rate: {
        parts_per_million: 20000
      }
    }
  ]
  requestId = await api.send.mintSingleNft(relayer, sender, externalRef, royalties, AVN_AUTHORITY)
  await pollTransactionStatus(api, requestId)

  // Get the ID of the freshly minted NFT
  let nftId = await api.query.getNftId(externalRef)

  // List the NFT for sale in fiat
  requestId = await api.send.listNftOpenForSale(relayer, sender, nftId, 'Fiat')
  await pollTransactionStatus(api, requestId)

  // Transfer a sold NFT
  requestId = await api.send.transferFiatNft(relayer, sender, recipient, nftId)
  await pollTransactionStatus(api, requestId)

  // Or cancel the listing
  requestId = await api.send.cancelListFiatNft(relayer, sender, nftId)
  await pollTransactionStatus(api, requestId)
}

(async () => await main())()


async function pollTransactionStatus(api, requestId) {
  for (i = 0; i < 10; i++) {
    await sleep(3000)
    const status = await api.poll.requestState(requestId)
    if (status === 'Processed') {
      console.log('Transaction processed')
      break
    } else if (status === 'Rejected') {
      console.log('Transaction failed')
      break
    }
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

```

## Further information
Check the [docs](https://aventus-network-services.github.io/avn-gateway-docs/)
