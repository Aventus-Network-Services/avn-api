# Changelog

All breaking changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/).

## v4.0.0 - 24/09/2024

In this release, we have added support for multi-currency payments, allowing users to pay their Gateway service fees in currencies other than the native one. To enable this, changes have been made to the following public interfaces:

### API setup
When setting up the SDK, the `options` object can now take an optional property called `paymentCurrencyToken`. This should be the Ethereum address of the token, in Hex format.

### Query
`getRelayerFees`:

This function accepts an extra mandatory parameter for `currencyToken`. This should be the Ethereum address of the token, in Hex format.

```
async getRelayerFees(
    relayerAddress: string,
    currencyToken: string,   // <---- New parameter
    userAddress: string,
    transactionType?: TxType
  ): Promise<RelayerFees | number> { }
```