'use strict';

import { TxType, Utils, registry } from '../utils';
import { AvnApiConfig, Royalty } from '../interfaces';
import { AccountUtils } from '../utils/accountUtils';
import { u8aConcat, u8aToHex } from '@polkadot/util';
import { createTypeUnsafe } from '@polkadot/types';
import log from 'loglevel';

export interface FeePaymentData {
  relayer: string;
  proxySignature: string;
  relayerFee: string;
  paymentNonce: number;
}

const numTypes = ['AccountId', 'Balance', 'BalanceOf', 'EraIndex', 'u8', 'u32', 'u64', 'u128', 'U256', 'H160', 'H256'];

const signing = {
  proxyAvtTransfer: async proxyArgs => await signProxyTokenTransfer(proxyArgs),
  proxyTokenTransfer: async proxyArgs => await signProxyTokenTransfer(proxyArgs),
  proxyConfirmTokenLift: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyMintEthereumBatchNft: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyTransferEthereumNft: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyCancelEthereumNftSale: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyEndEthereumBatchSale: async proxyArgs => await signProxyAddEthereumLog(proxyArgs),
  proxyTokenLower: async proxyArgs => await signProxyTokenLower(proxyArgs),
  proxyCreateNftBatch: async proxyArgs => await signProxyCreateNftBatch(proxyArgs),
  proxyMintSingleNft: async proxyArgs => await signProxyMintSingleNft(proxyArgs),
  proxyMintBatchNft: async proxyArgs => await signProxyMintBatchNft(proxyArgs),
  proxyListNftOpenForSale: async proxyArgs => await signProxyListNftOpenForSale(proxyArgs),
  proxyListEthereumNftForSale: async proxyArgs => await signProxyListNftOpenForSale(proxyArgs),
  proxyListNftBatchForSale: async proxyArgs => await signProxyListNftBatchForSale(proxyArgs),
  proxyListEthereumNftBatchForSale: async proxyArgs => await signProxyListNftBatchForSale(proxyArgs),
  proxyTransferFiatNft: async proxyArgs => await signProxyTransferFiatNft(proxyArgs),
  proxyCancelListFiatNft: async proxyArgs => await signProxyCancelListFiatNft(proxyArgs),
  proxyStakeAvt: async proxyArgs => await signProxyNominate(proxyArgs),
  proxyEndNftBatchSale: async proxyArgs => await signProxyEndNftBatchSale(proxyArgs),
  proxyIncreaseStake: async proxyArgs => await signProxyIncreaseStake(proxyArgs),
  proxyUnstake: async proxyArgs => await signProxyUnstake(proxyArgs),
  proxyWithdrawUnlocked: async proxyArgs => await signProxyWithdrawUnlocked(proxyArgs),
  proxyScheduleLeaveNominators: async proxyArgs => await signProxyScheduleLeaveNominators(proxyArgs),
  proxyExecuteLeaveNominators: async proxyArgs => await signProxyExecuteLeaveNominators(proxyArgs)
};

export default class ProxyUtils {
  // signing object contains functions called by passing transaction type and the arguments to sign to generateProxySignature
  static async generateProxySignature(api: AvnApiConfig, signerAddress: string, transactionType: TxType, proxyArgs: object) {
    return await signing[transactionType](Object.assign({}, proxyArgs, { api, signerAddress }));
  }

  static async generateFeePaymentSignature(feeData: FeePaymentData, signerAddress: string, api: AvnApiConfig) {
    feeData.relayer = AccountUtils.convertToPublicKeyIfNeeded(feeData.relayer);
    const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

    const proxyProofData = [
      { AccountId: user },
      { AccountId: feeData.relayer },
      { MultiSignature: { Sr25519: feeData.proxySignature } }
    ];

    const orderedData = [
      { Text: 'authorization for proxy payment' },
      { SkipEncode: encodeOrderedData(proxyProofData) },
      { AccountId: feeData.relayer },
      { Balance: feeData.relayerFee },
      { u64: feeData.paymentNonce }
    ];

    log.debug(`\nPayment signature raw data: `, JSON.stringify(orderedData, null, 2));

    const encodedDataToSign = encodeOrderedData(orderedData);

    log.debug(`\nPayment signature encoded data: `, u8aToHex(encodedDataToSign));

    const sig = await signData(api, signerAddress, encodedDataToSign);

    log.warn(`\nPayment signature: `, sig);

    return sig;
  }
}

async function signProxyTokenTransfer({ relayer, recipient, token, amount, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);
  recipient = AccountUtils.convertToPublicKeyIfNeeded(recipient);

  const orderedData = [
    { Text: 'authorization for transfer operation' },
    { AccountId: relayer },
    { AccountId: user },
    { AccountId: recipient },
    { H160: token },
    { u128: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyAddEthereumLog({ relayer, eventType, ethereumTransactionHash, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for add ethereum log operation' },
    { AccountId: relayer },
    { u8: eventType },
    { H256: ethereumTransactionHash },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyTokenLower({ relayer, token, amount, t1Recipient, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'authorization for lower operation' },
    { AccountId: relayer },
    { AccountId: user },
    { H160: token },
    { u128: amount },
    { H160: t1Recipient },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyCreateNftBatch({ relayer, totalSupply, royalties, t1Authority, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for create batch operation' },
    { AccountId: relayer },
    { u64: totalSupply },
    { SkipEncode: encodeRoyalties(royalties) },
    { H160: t1Authority },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyMintSingleNft({ relayer, externalRef, royalties, t1Authority, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for mint single nft operation' },
    { AccountId: relayer },
    { 'Vec<u8>': externalRef },
    { SkipEncode: encodeRoyalties(royalties) },
    { H160: t1Authority }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyMintBatchNft({ relayer, batchId, index, owner, externalRef, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  owner = AccountUtils.convertToPublicKeyIfNeeded(owner);

  const orderedData = [
    { Text: 'authorization for mint batch nft operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u64: index },
    { 'Vec<u8>': externalRef },
    { AccountId: owner }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyListNftOpenForSale({ relayer, nftId, market, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list nft open for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyListNftBatchForSale({ relayer, batchId, market, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list batch for sale operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyTransferFiatNft({ relayer, nftId, recipient, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  recipient = AccountUtils.convertToPublicKeyIfNeeded(recipient);

  const orderedData = [
    { Text: 'authorization for transfer fiat nft operation' },
    { AccountId: relayer },
    { U256: nftId },
    { AccountId: recipient },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyCancelListFiatNft({ relayer, nftId, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for cancel list fiat nft for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyEndNftBatchSale({ relayer, batchId, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for end batch sale operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyNominate({ relayer, targets, amount, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for nominate operation' },
    { AccountId: relayer },
    { 'Vec<LookupSource>': targets },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyIncreaseStake({ relayer, amount, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for nominator bond extra operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyUnstake({ relayer, amount, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for scheduling nominator unbond operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyWithdrawUnlocked({ relayer, nonce, signerAddress, api }) {
  relayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'parachain authorization for executing nomination requests operation' },
    { AccountId: relayer },
    { AccountId: user },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyScheduleLeaveNominators({ relayer, nonce, signerAddress, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for scheduling leaving nominators operation' },
    { AccountId: dataRelayer },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

async function signProxyExecuteLeaveNominators({ relayer, nonce, signerAddress, api }) {
  const dataRelayer = AccountUtils.convertToPublicKeyIfNeeded(relayer);
  const user = AccountUtils.convertToPublicKeyIfNeeded(signerAddress);

  const orderedData = [
    { Text: 'parachain authorization for executing leave nominators operation' },
    { AccountId: dataRelayer },
    { AccountId: user },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(api, signerAddress, encodedDataToSign);
}

function encodeOrderedData(data: object[]) {
  const encodedDataToSign = data.map(d => {
    const [type, value] = Object.entries(d)[0];
    return type === 'SkipEncode' ? value : registry.createType(type as any, value).toU8a(numTypes.includes(type));
  });
  return u8aConcat(...encodedDataToSign);
}

function encodeRoyalties(royalties: Royalty[]) {
  const encodedRoyalties = royalties.map(r => {
    const orderedData = [{ H160: r.recipient_t1_address }, { u32: r.rate.parts_per_million }];
    return encodeOrderedData(orderedData);
  });

  const encodedResult = createTypeUnsafe(registry, 'Vec<(H160, u32)>', [encodedRoyalties]);
  return encodedResult.toU8a(false);
}

// the response to sign() can come from a remote signer so
// handle hex and bytes return types here.
async function signData(api: AvnApiConfig, signerAddress: string, encodedDataToSign: string | Uint8Array) {
  encodedDataToSign = Utils.convertToHexIfNeeded(encodedDataToSign);
  const signature = await api.sign(encodedDataToSign, signerAddress);
  return Utils.convertToHexIfNeeded(signature);
}
