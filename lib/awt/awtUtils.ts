'use strict';

import { hexToU8a, u8aToHex, u8aConcat } from '@polkadot/util';
import { Utils, registry } from '../utils';
import { AccountUtils } from '../utils';
import { SplitFeeConfig, IAwt, Signer } from '../interfaces';

const MAX_TOKEN_AGE_MSEC = 600000;
const SIGNING_CONTEXT = 'awt_gateway_api';

export class AwtUtils {
  static async generateAwtPayload(signer: Signer, issuedAt: string, options: SplitFeeConfig): Promise<IAwt> {
    const avnPublicKey = u8aToHex(AccountUtils.convertToPublicKeyBytes(signer.address));

    let hasPayer = false;
    let payerAddress = undefined;

    if (options) {
      hasPayer = options.hasPayer || false;
      payerAddress = options.payerAddress || undefined;
    }

    if (payerAddress) {
      payerAddress = AccountUtils.addressToPublicKey(payerAddress);
    }

    const encodedData = this.encodeAvnPublicKeyForSigning(avnPublicKey, issuedAt, hasPayer, payerAddress);
    const signature = await signer.sign(encodedData, signer.address);

    return {
      pk: avnPublicKey,
      iat: issuedAt,
      hasPayer,
      payer: payerAddress,
      sig: Utils.convertToHexIfNeeded(signature)
    };
  }

  static async generateAwtToken(options: SplitFeeConfig, signer: Signer): Promise<string> {
    const payload = await this.generateAwtPayload(signer, new Date().toISOString(), options);
    return this.generateAwtTokenFromPayload(payload);
  }

  static generateAwtTokenFromPayload(payload: IAwt): string {
    const payloadBuff = Buffer.from(JSON.stringify(payload));
    return payloadBuff.toString('base64');
  }

  static encodeAvnPublicKeyForSigning(avnPublicKey: string, issuedAt: string, hasPayer: boolean, payerAddress: string): string {
    const encodedContext = registry.createType('Text', SIGNING_CONTEXT);
    const encodedPublicKey = registry.createType('AccountId', hexToU8a(avnPublicKey));
    const encodedIssuedAt = registry.createType('Text', issuedAt);

    if (!hasPayer && !payerAddress) {
      // this is a legacy token
      const encodedData = u8aConcat(encodedContext.toU8a(false), encodedPublicKey.toU8a(true), encodedIssuedAt.toU8a(false));
      return u8aToHex(encodedData);
    } else {
      const encodedHasPayer = registry.createType('bool', hasPayer);
      const encodedPayer = registry.createType('Option<AccountId>', payerAddress);

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

  static tokenAgeIsValid(awtTokenBase64: string): boolean {
    if (!awtTokenBase64) return false;

    try {
      const awtToken = JSON.parse(Buffer.from(awtTokenBase64, 'base64').toString('ascii'));
      const issuedAt = new Date(awtToken.iat);
      const tokenAge = new Date().getTime() - issuedAt.getTime();
      return tokenAge >= 0 && tokenAge < MAX_TOKEN_AGE_MSEC;
    } catch (err) {
      console.error(`Error checking the age of the awt token: ${err}`);
      return false;
    }
  }
}
