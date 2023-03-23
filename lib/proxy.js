'use strict';

const common = require('./common.js');
const { u8aToHex, u8aConcat } = require('@polkadot/util');

// signing object contains functions called by passing transaction type and the arguments to sign to generateProxySignature
const generateProxySignature = (signer, transactionType, proxyArgs) =>
  signing[transactionType](Object.assign({}, proxyArgs, { signer }));

const signing = {
  proxyAvtTransfer: proxyArgs => signProxyTokenTransfer(proxyArgs),
  proxyTokenTransfer: proxyArgs => signProxyTokenTransfer(proxyArgs),
  proxyConfirmTokenLift: proxyArgs => signProxyConfirmTokenLift(proxyArgs),
  proxyTokenLower: proxyArgs => signProxyTokenLower(proxyArgs),
  proxyCreateNftBatch: proxyArgs => signProxyCreateNftBatch(proxyArgs),
  proxyMintSingleNft: proxyArgs => signProxyMintSingleNft(proxyArgs),
  proxyMintBatchNft: proxyArgs => signProxyMintBatchNft(proxyArgs),
  proxyListNftOpenForSale: proxyArgs => signProxyListNftOpenForSale(proxyArgs),
  proxyListNftBatchForSale: proxyArgs => signProxyListNftBatchForSale(proxyArgs),
  proxyTransferFiatNft: proxyArgs => signProxyTransferFiatNft(proxyArgs),
  proxyCancelListFiatNft: proxyArgs => signProxyCancelListFiatNft(proxyArgs),
  proxyStakeAvt: proxyArgs => signProxyNominate(proxyArgs),
  proxyEndNftBatchSale: proxyArgs => signProxyEndNftBatchSale(proxyArgs),
  proxyIncreaseStake: proxyArgs => signProxyIncreaseStake(proxyArgs),
  proxyUnstake: proxyArgs => signProxyUnstake(proxyArgs),
  proxyWithdrawUnlocked: proxyArgs => signProxyWithdrawUnlocked(proxyArgs),
  proxyScheduleLeaveNominators: proxyArgs => signProxyScheduleLeaveNominators(proxyArgs),
  proxyExecuteLeaveNominators: proxyArgs => signProxyExecuteLeaveNominators(proxyArgs)
};

const numTypes = ['AccountId', 'Balance', 'BalanceOf', 'EraIndex', 'u8', 'u32', 'u64', 'u128', 'U256', 'H160', 'H256'];

function signProxyTokenTransfer({ relayer, user, recipient, token, amount, nonce, signer }) {
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
  return signData(signer, encodedDataToSign);
}

function signProxyConfirmTokenLift({ relayer, eventType, ethereumTransactionHash, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for add ethereum log operation' },
    { AccountId: relayer },
    { u8: eventType },
    { H256: ethereumTransactionHash },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyTokenLower({ relayer, user, token, amount, t1Recipient, nonce, signer }) {
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
  return signData(signer, encodedDataToSign);
}

function signProxyCreateNftBatch({ relayer, totalSupply, royalties, t1Authority, nonce, signer }) {
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
  return signData(signer, encodedDataToSign);
}

function signProxyMintSingleNft({ relayer, externalRef, royalties, t1Authority, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for mint single nft operation' },
    { AccountId: relayer },
    { 'Vec<u8>': externalRef },
    { SkipEncode: encodeRoyalties(royalties) },
    { H160: t1Authority }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyMintBatchNft({ relayer, batchId, index, owner, externalRef, signer }) {
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
  return signData(signer, encodedDataToSign);
}

function signProxyListNftOpenForSale({ relayer, nftId, market, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list nft open for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyListNftBatchForSale({ relayer, batchId, market, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list batch for sale operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyTransferFiatNft({ relayer, nftId, recipient, nonce, signer }) {
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
  return signData(signer, encodedDataToSign);
}

function signProxyCancelListFiatNft({ relayer, nftId, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for cancel list fiat nft for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyEndNftBatchSale({ relayer, batchId, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for end batch sale operation' },
    { AccountId: relayer },
    { U256: batchId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyNominate({ relayer, targets, amount, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for nominate operation' },
    { AccountId: relayer },
    { 'Vec<LookupSource>': targets },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyIncreaseStake({ relayer, amount, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for nominator bond extra operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyUnstake({ relayer, amount, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for scheduling nominator unbond operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyWithdrawUnlocked({ relayer, nominator, nonce, signer }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for executing nomination requests operation' },
    { AccountId: relayer },
    { AccountId: nominator },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyScheduleLeaveNominators({ relayer, nonce, signer }) {
  const dataRelayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for scheduling leaving nominators operation' },
    { AccountId: dataRelayer },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function signProxyExecuteLeaveNominators({ relayer, nominator, nonce, signer }) {
  const dataRelayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'parachain authorization for executing leave nominators operation' },
    { AccountId: dataRelayer },
    { AccountId: nominator },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(signer, encodedDataToSign);
}

function generateFeePaymentSignature({ relayer, user, proxySignature, relayerFee, paymentNonce, signer }) {
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
  return signData(signer, encodedDataToSign);
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

function signData(signer, encodedDataToSign) {
  const signature = u8aToHex(signer.sign(encodedDataToSign));
  return signature;
}

module.exports = {
  generateProxySignature,
  generateFeePaymentSignature
};
