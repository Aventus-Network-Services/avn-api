'use strict';

const common = require('./common.js');
const utils = require('./utils.js');
const { u8aConcat } = require('@polkadot/util');

// signing object contains functions called by passing transaction type and the arguments to sign to generateProxySignature
const generateProxySignature = async (signer, transactionType, proxyArgs) =>
  await signing[transactionType](Object.assign({}, proxyArgs, { signer }));

const signing = {
  proxyAvtTransfer: async proxyArgs => await signProxyTokenTransfer(proxyArgs),
  proxyTokenTransfer: async proxyArgs => await signProxyTokenTransfer(proxyArgs),
  proxyConfirmTokenLift: async proxyArgs => await signProxyConfirmTokenLift(proxyArgs),
  proxyTokenLower: async proxyArgs => await signProxyTokenLower(proxyArgs),
  proxyCreateNftBatch: async proxyArgs => await signProxyCreateNftBatch(proxyArgs),
  proxyMintSingleNft: async proxyArgs => await signProxyMintSingleNft(proxyArgs),
  proxyMintBatchNft: async proxyArgs => await signProxyMintBatchNft(proxyArgs),
  proxyListNftOpenForSale: async proxyArgs => await signProxyListNftOpenForSale(proxyArgs),
  proxyListNftBatchForSale: async proxyArgs => await signProxyListNftBatchForSale(proxyArgs),
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

const numTypes = ['AccountId', 'Balance', 'BalanceOf', 'EraIndex', 'u8', 'u32', 'u64', 'u128', 'U256', 'H160', 'H256'];

async function signProxyTokenTransfer({ relayer, user, recipient, token, amount, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);
  user = common.convertToPublicKeyIfNeeded(user);
  recipient = common.convertToPublicKeyIfNeeded(recipient);

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
  return await signData(signer, encodedDataToSign);
}

async function signProxyConfirmTokenLift({ relayer, eventType, ethereumTransactionHash, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for add ethereum log operation' },
    { AccountId: relayer },
    { u8: eventType },
    { H256: ethereumTransactionHash },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyTokenLower({ relayer, user, token, amount, t1Recipient, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);
  user = common.convertToPublicKeyIfNeeded(user);

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
  return await signData(signer, encodedDataToSign);
}

async function signProxyCreateNftBatch({ relayer, totalSupply, royalties, t1Authority, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for create batch operation' },
    { AccountId: relayer },
    { u64: totalSupply },
    { SkipEncode: encodeRoyalties(royalties) },
    { H160: t1Authority },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyMintSingleNft({ relayer, externalRef, royalties, t1Authority, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for mint single nft operation' },
    { AccountId: relayer },
    { 'Vec<u8>': externalRef },
    { SkipEncode: encodeRoyalties(royalties) },
    { H160: t1Authority }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyMintBatchNft({ relayer, batchId, index, owner, externalRef, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);
  owner = common.convertToPublicKeyIfNeeded(owner);

  const orderedData = [
    { Text: 'authorization for mint batch nft operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u64: index },
    { AccountId: owner },
    { 'Vec<u8>': externalRef }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyListNftOpenForSale({ relayer, nftId, market, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list nft open for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyListNftBatchForSale({ relayer, batchId, market, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list batch for sale operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyTransferFiatNft({ relayer, nftId, recipient, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);
  recipient = common.convertToPublicKeyIfNeeded(recipient);

  const orderedData = [
    { Text: 'authorization for transfer fiat nft operation' },
    { AccountId: relayer },
    { U256: nftId },
    { AccountId: recipient },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyCancelListFiatNft({ relayer, nftId, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for cancel list fiat nft for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyEndNftBatchSale({ relayer, batchId, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for end batch sale operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyNominate({ relayer, targets, amount, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for nominate operation' },
    { AccountId: relayer },
    { 'Vec<LookupSource>': targets },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyIncreaseStake({ relayer, amount, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for nominator bond extra operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyUnstake({ relayer, amount, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for scheduling nominator unbond operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyWithdrawUnlocked({ relayer, user, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for executing nomination requests operation' },
    { AccountId: relayer },
    { AccountId: user },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyScheduleLeaveNominators({ relayer, nonce, signer }) {
  const dataRelayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for scheduling leaving nominators operation' },
    { AccountId: dataRelayer },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function signProxyExecuteLeaveNominators({ relayer, user, nonce, signer }) {
  const dataRelayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for executing leave nominators operation' },
    { AccountId: dataRelayer },
    { AccountId: user },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

async function generateFeePaymentSignature({ relayer, user, proxySignature, relayerFee, paymentNonce }, signer) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);
  user = common.convertToPublicKeyIfNeeded(user);

  const proxyProofData = [{ AccountId: user }, { AccountId: relayer }, { MultiSignature: { Sr25519: proxySignature } }];

  const orderedData = [
    { Text: 'authorization for proxy payment' },
    { SkipEncode: encodeOrderedData(proxyProofData) },
    { AccountId: relayer },
    { Balance: relayerFee },
    { u64: paymentNonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return await signData(signer, encodedDataToSign);
}

function encodeOrderedData(data) {
  const encodedDataToSign = data.map(d => {
    const [type, value] = Object.entries(d)[0];
    return type === 'SkipEncode' ? value : common.registry.createType(type, value).toU8a(numTypes.includes(type));
  });
  return u8aConcat(...encodedDataToSign);
}

function encodeRoyalties(royalties) {
  const encodedRoyalties = royalties.map(r => {
    const orderedData = [{ H160: r.recipient_t1_address }, { u32: r.rate.parts_per_million }];
    return encodeOrderedData(orderedData);
  });

  const encodedResult = common.createTypeUnsafe(common.registry, 'Vec<(H160, u32)>', [encodedRoyalties]);
  return encodedResult.toU8a(false);
}

// the response to sign() can come from a remote signer so
// handle hex and bytes return types here.
async function signData(signer, encodedDataToSign) {
  encodedDataToSign = utils.convertToHexIfNeeded(encodedDataToSign);
  const signature = await signer.sign(encodedDataToSign);
  return utils.convertToHexIfNeeded(signature);
}

module.exports = {
  generateProxySignature,
  generateFeePaymentSignature
};
