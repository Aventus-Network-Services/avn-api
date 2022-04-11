'use strict';

const common = require('./common.js');
const { u8aToHex, u8aConcat } = require('@polkadot/util');

// signing object contains functions called by passing transaction type and the arguments to sign to generateProxySignature
const generateProxySignature = (transactionType, proxyArgs) => signing[transactionType](proxyArgs);
const signing = {
  proxyAvtTransfer: proxyArgs => signProxyTokenTransfer(proxyArgs),
  proxyTokenTransfer: proxyArgs => signProxyTokenTransfer(proxyArgs),
  proxyConfirmTokenLift: proxyArgs => signProxyConfirmTokenLift(proxyArgs),
  proxyTokenLower: proxyArgs => signProxyTokenLower(proxyArgs),
  proxyMintSingleNft: proxyArgs => signProxyMintSingleNft(proxyArgs),
  proxyListNftOpenForSale: proxyArgs => signProxyListNftOpenForSale(proxyArgs),
  proxyTransferFiatNft: proxyArgs => signProxyTransferFiatNft(proxyArgs),
  proxyCancelListFiatNft: proxyArgs => signProxyCancelListFiatNft(proxyArgs),
  proxyBond: proxyArgs => signProxyBond(proxyArgs),
  proxyNominate: proxyArgs => signProxyNominate(proxyArgs),
  proxyIncreaseStake: proxyArgs => signProxyIncreaseStake(proxyArgs),
  proxyUnstake: proxyArgs => signProxyUnstake(proxyArgs),
  proxyWithdrawUnlocked: proxyArgs => signProxyWithdrawUnlocked(proxyArgs),
  proxyPayoutStakers: proxyArgs => signProxyPayoutStakers(proxyArgs)
};

const numTypes = ['AccountId', 'Balance', 'BalanceOf', 'EraIndex', 'u8', 'u32', 'u64', 'u128', 'U256', 'H160', 'H256'];

function signProxyTokenTransfer({ relayer, user, recipient, token, amount, nonce }) {
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
  return signData(encodedDataToSign);
}

function signProxyConfirmTokenLift({ relayer, eventType, ethereumTransactionHash, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for add ethereum log operation' },
    { AccountId: relayer },
    { u8: eventType },
    { H256: ethereumTransactionHash },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyTokenLower({ relayer, user, token, amount, t1Recipient, nonce }) {
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
  return signData(encodedDataToSign);
}

function signProxyMintSingleNft({ relayer, externalRef, royalties, t1Authority }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for mint single nft operation' },
    { AccountId: relayer },
    { 'Vec<u8>': externalRef },
    { SkipEncode: encodeRoyalties(royalties) },
    { H160: t1Authority }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyListNftOpenForSale({ relayer, user, nftId, market, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for list nft open for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u8: market },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyTransferFiatNft({ relayer, nftId, recipient, nonce }) {
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
  return signData(encodedDataToSign);
}

function signProxyCancelListFiatNft({ relayer, nftId, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for cancel list fiat nft for sale operation' },
    { AccountId: relayer },
    { U256: nftId },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyBond({ relayer, user, amount, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);
  user = common.convertToPublicKeyIfNeeded(user);

  const orderedData = [
    { Text: 'authorization for bond operation' },
    { AccountId: relayer },
    { LookupSource: user },
    { BalanceOf: amount },
    { RewardDestination: 'Stash' },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyNominate({ relayer, targets, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for nominate operation' },
    { AccountId: relayer },
    { 'Vec<LookupSource>': targets },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyIncreaseStake({ relayer, amount, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for bond extra operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyUnstake({ relayer, amount, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for unbond operation' },
    { AccountId: relayer },
    { BalanceOf: amount },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyWithdrawUnlocked({ relayer, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);
  const numSlashSpan = 0; // We dont use slashing

  const orderedData = [
    { Text: 'authorization for withdraw unbonded operation' },
    { AccountId: relayer },
    { u32: numSlashSpan },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function signProxyPayoutStakers({ relayer, era, nonce }) {
  relayer = common.convertToPublicKeyIfNeeded(relayer);

  const orderedData = [
    { Text: 'authorization for signed payout stakers operation' },
    { AccountId: relayer },
    { EraIndex: era },
    { u64: nonce }
  ];

  const encodedDataToSign = encodeOrderedData(orderedData);
  return signData(encodedDataToSign);
}

function generateFeePaymentSignature({ relayer, user, proxySignature, relayerFee, paymentNonce }) {
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
  return signData(encodedDataToSign);
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

function signData(encodedDataToSign) {
  const signer = common.getSigner();
  const signature = u8aToHex(signer.sign(encodedDataToSign));
  return signature;
}

module.exports = {
  generateProxySignature,
  generateFeePaymentSignature
};
