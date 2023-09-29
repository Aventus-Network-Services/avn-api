'use strict';

import { hexToU8a, isHex, u8aToHex, isNumber } from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';
import { validate as uuidValidate } from 'uuid';
import BN from 'bn.js';
import { Royalty, Signer } from '../interfaces';
import { Query } from '../apis/query';
import { keyring } from './index';

export class Utils {
  static validateAccount(account: string) {
    try {
      encodeAddress(isHex(account) ? hexToU8a(account) : decodeAddress(account));
      return account;
    } catch (e) {
      console.error(e.toString());
      throw new Error(e);
    }
  }

  static validateAndConvertAmountToString(amount: string) {
    const amountAsString = amount && amount.toString();
    const isValid = /^\d+$/.test(amountAsString) && new BN(amount).isZero() === false;
    if (isValid === false) {
      throw new Error(`Invalid amount type: ${amount}`);
    }
    return amountAsString;
  }

  static validateEthereumAddress(ethereumAddress: string) {
    const isValid = isHex(ethereumAddress) && ethereumAddress.split('').length == 42;
    if (isValid === false) {
      throw new Error(`Invalid ethereum address type: ${ethereumAddress}`);
    }
  }

  static validateEthereumTransactionHash(ethereumTransactionHash: string) {
    const isValid = isHex(ethereumTransactionHash) && ethereumTransactionHash.split('').length == 66;
    if (isValid === false) {
      throw new Error(`Invalid ethereum address type: ${ethereumTransactionHash}`);
    }
  }

  static validateRoyalties(royalties: Royalty[]) {
    this.validateIsArray(royalties);
    if (royalties.length === 0) {
      return;
    }

    royalties.forEach(royalty => {
      this.validateEthereumAddress(royalty.recipient_t1_address);
      if (
        Number.isInteger(royalty.rate.parts_per_million) === false ||
        royalty.rate.parts_per_million <= 0 ||
        royalty.rate.parts_per_million > 1000000
      ) {
        throw new Error(`Invalid rate value: ${royalty.rate.parts_per_million}`);
      }
    });
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  static validateIsArray(array: any) {
    const isValid = Array.isArray(array);
    if (isValid === false) {
      throw new Error(`Invalid array type: ${array}`);
    }
  }

  static formatNftId(nftId: string) {
    try {
      if (!nftId) throw nftId;
      const hexNftId = isHex(nftId) ? nftId.substring(2) : new BN(nftId).toString(16);
      if (hexNftId.length > 64) throw nftId;
      return new BN(hexNftId, 16).toString(10);
    } catch (nftId) {
      throw new Error(`Invalid nftId type: ${nftId}`);
    }
  }

  static validateRequestId(requestId: string) {
    const isValid = uuidValidate(requestId);
    if (isValid === false) {
      throw new Error(`Invalid request ID type: ${requestId}`);
    }
  }

  static validateStringIsPopulated(string: string) {
    const isValid = !(string ? string.replace(/\s/g, '').length == 0 : true);
    if (isValid === false) {
      throw new Error(`String is not populated: ${string}`);
    }
  }

  static validateStakingTargets(targets: string[]) {
    this.validateIsArray(targets);
    if (targets.length === 0) {
      throw new Error(`Staking targets is a mandatory field. You must select at least 1 target to nominate.`);
    }
  }

  static validateNumber(num: string) {
    if (isNumber(parseInt(num)) === false) {
      throw new Error(`Value is not a valid number: ${num}`);
    }
  }

  static async getMinimumStakingValue(queryApi: Query) {
    const minStakingValuePerValidator = new BN(await queryApi.getMinTotalNominatorStake());
    const validators = await queryApi.getValidatorsToNominate();
    return new BN(minStakingValuePerValidator.mul(new BN(validators.length)));
  }

  static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static getSignerFromSuri(suri: string): Signer {
    if (!suri) throw new Error('Unable to get signer because Suri is not defined');
    const user = keyring.addFromUri(suri);
    return {
      // eslint-disable-next-line  @typescript-eslint/no-unused-vars
      sign: async (data, _) => await u8aToHex(user.sign(data)),
      address: user.address
    };
  }

  static convertToHexIfNeeded(input: string | Uint8Array): string {
    if (isHex(input)) {
      return input.toLowerCase();
    }

    return u8aToHex(input as Uint8Array).toLowerCase();
  }
}
