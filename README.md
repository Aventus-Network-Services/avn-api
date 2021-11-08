# Quick Start

## Prerequisites
Before running the API you must have an account on the AvN holding a minimum 100 AVT. Set this account's mnemonic or secret seed as the "SURI" environment variable:
```
export SURI=<mnemonic OR secret seed>
```
examples: \
`export SURI=caution juice atom organ advance problem want pledge someone senior holiday very`
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

// The AvN address of the account set as SURI in your environment:
const MY_ACCOUNT = '5Gv8Y...'


async function main() {
  const api = new AvnApi(AVN_GATEWAY_ENDPOINT)
  await api.init()

  // Get the current total AVT supply of the AvN
  console.log(await api.query.getTotalAvt())

  // Get the AVT balance of an account
  console.log(await api.query.getAvtBalance(MY_ACCOUNT))

  // Get the ERC-20/ERC-777 token balance of an account
  const someOtherAccount = '5DAgx...'
  const token = '0x7e5bb...'
  console.log(await api.query.getTokenBalance(someOtherAccount, token))

  // Transfer some AVT
  const sender = MY_ACCOUNT
  const recipient = someOtherAccount
  const amount = '100'
  const requestId = await api.send.transferAvt(AVN_RELAYER, sender, recipient, amount)

  // Poll on the status of the AVT transfer
  for (i = 0; i < 10; i++) {
    let status = await api.poll.requestState(requestId)
    console.log(`Current status: ${status}`)
    if (status === 'Processed' || status === 'Rejected') break
    await sleep(3000)
  }

  // Transfer some tokens  
  await api.send.transferToken(AVN_RELAYER, sender, recipient, token, amount)
  // Poll for status or wait and check the balance
}

(async () => await main())()

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

## Further information
Check the [docs](https://aventus-network-services.github.io/avn-gateway-docs/)