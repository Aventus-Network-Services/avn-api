'use strict';

const { hexToU8a, u8aToHex, u8aConcat } = require('@polkadot/util');
const common = require('./common.js');

const MAX_TOKEN_AGE_MSEC = 60000;
const SIGNING_CONTEXT = 'awt_gateway_api';

function generateAwtPayload(suri, issuedAt) {
  const tokenOwner = common.keyring.addFromUri(suri);
  const avnPublicKey = u8aToHex(tokenOwner.publicKey);
  const encodedData = encodeAvnPublicKeyForSigning(avnPublicKey, issuedAt);
  const signature = tokenOwner.sign(encodedData);

  return {
    pk: avnPublicKey,
    iat: issuedAt,
    sig: u8aToHex(signature)
  };
}

function generateAwtToken(suri) {
  let payload = generateAwtPayload(suri, new Date().toISOString());
  return generateAwtTokenFromPayload(payload);
}

function generateAwtTokenFromPayload(payload) {
  const payloadBuff = new Buffer.from(JSON.stringify(payload));
  return payloadBuff.toString('base64');
}

function encodeAvnPublicKeyForSigning(avnPublicKey, issuedAt) {
  const encodedData = u8aConcat(
    common.registry.createType('Text', SIGNING_CONTEXT).toU8a(false),
    common.registry.createType('AccountId', hexToU8a(avnPublicKey)).toU8a(true),
    common.registry.createType('Text', issuedAt).toU8a(false)
  );

  return u8aToHex(encodedData);
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
