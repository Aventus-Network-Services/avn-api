'use strict';

const { hexToU8a, u8aToHex, u8aConcat } = require('@polkadot/util');
const common = require('./common.js');
const utils = require('./utils.js');

const MAX_TOKEN_AGE_MSEC = 600000;
const SIGNING_CONTEXT = 'awt_gateway_api';

function generateAwtPayload(suri, issuedAt, options) {
  const tokenOwner = common.keyring.addFromUri(suri);
  const avnPublicKey = u8aToHex(tokenOwner.publicKey);

  let hasPayer = false;
  let payerAddress = undefined;

  if (options) {
    hasPayer = options.hasPayer || false;
    payerAddress = options.payerAddress || undefined;
  }

  if (payerAddress) {
    payerAddress = utils.addressToPublicKey(payerAddress);
  }

  const encodedData = encodeAvnPublicKeyForSigning(avnPublicKey, issuedAt, hasPayer, payerAddress);
  const signature = tokenOwner.sign(encodedData);

  return {
    pk: avnPublicKey,
    iat: issuedAt,
    hasPayer,
    payer: payerAddress,
    sig: u8aToHex(signature)
  };
}

function generateAwtToken(options) {
  options = options || {};
  options.suri = options.suri ?? process.env.AVN_SURI;
  if (!options.suri) throw new Error('Please pass a SURI or set AVN_SURI environment variable');

  let payload = generateAwtPayload(options.suri, new Date().toISOString(), options);
  return generateAwtTokenFromPayload(payload);
}

function generateAwtTokenFromPayload(payload) {
  const payloadBuff = new Buffer.from(JSON.stringify(payload));
  return payloadBuff.toString('base64');
}

function encodeAvnPublicKeyForSigning(avnPublicKey, issuedAt, hasPayer, payerAddress) {
  const encodedContext = common.registry.createType('Text', SIGNING_CONTEXT);
  const encodedPublicKey = common.registry.createType('AccountId', hexToU8a(avnPublicKey));
  const encodedIssuedAt = common.registry.createType('Text', issuedAt);

  if (!hasPayer && !payerAddress) {
    // this is a legacy token
    const encodedData = u8aConcat(encodedContext.toU8a(false), encodedPublicKey.toU8a(true), encodedIssuedAt.toU8a(false));
    return u8aToHex(encodedData);
  } else {
    const encodedHasPayer = common.registry.createType('bool', hasPayer);
    const encodedPayer = common.registry.createType('Option<AccountId>', payerAddress);

    const encodedData = u8aConcat(
      encodedContext.toU8a(false),
      encodedPublicKey.toU8a(true),
      encodedIssuedAt.toU8a(false),
      encodedHasPayer.toU8a(true),
      encodedPayer.toU8a(true)
    );
    return u8aToHex(encodedData);
  }
}

function tokenAgeIsValid(awtTokenBase64) {
  if (!awtTokenBase64) return false;

  try {
    const awtToken = JSON.parse(Buffer.from(awtTokenBase64, 'base64').toString('ascii'));
    const issuedAt = new Date(awtToken.iat);
    const tokenAge = new Date() - issuedAt;

    return tokenAge >= 0 && tokenAge < MAX_TOKEN_AGE_MSEC;
  } catch (err) {
    console.error(`Error checking the age of the awt token: ${err}`);
    return false;
  }
}

module.exports = {
  generateAwtToken,
  generateAwtTokenFromPayload,
  generateAwtPayload,
  tokenAgeIsValid,
  encodeAvnPublicKeyForSigning
};
