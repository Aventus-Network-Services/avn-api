'use strict';

import { Utils } from './utils';
import { blake2AsHex, mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
import { hexToU8a, u8aToHex, isHex } from '@polkadot/util';
import { AvnAccount } from '../interfaces';
import { keyring } from './index';

export class AccountUtils {
  static generateNewAccount(): AvnAccount {
    const mnemonic = mnemonicGenerate();
    const keyPair = keyring.createFromUri(mnemonic);
    const account = {
      mnemonic,
      seed: u8aToHex(mnemonicToMiniSecret(mnemonic)),
      address: keyPair.address,
      publicKey: u8aToHex(keyPair.publicKey)
    };
    return account;
  }

  static addressToPublicKey(address: string): string {
    Utils.validateAccount(address);
    return this.convertToPublicKeyIfNeeded(address);
  }

  static publicKeyToAddress(accountAddressOrPublicKey: string): string {
    return this.convertToAddress(accountAddressOrPublicKey);
  }

  static addressToPublicKeyBytes(address: string): Uint8Array {
    Utils.validateAccount(address);
    return this.convertToPublicKeyBytes(address);
  }

  static convertToPublicKeyIfNeeded(accountAddressOrPublicKey: string) {
    if (this.isAccountPK(accountAddressOrPublicKey)) {
      return accountAddressOrPublicKey;
    }

    const pk = this.convertToPublicKeyBytes(accountAddressOrPublicKey);
    return u8aToHex(pk);
  }

  static convertToPublicKeyBytes(accountAddressOrPublicKey: string): Uint8Array {
    try {
      return keyring.decodeAddress(accountAddressOrPublicKey);
    } catch (error) {
      const msg = 'Expected SS58 address (eg: "5FbUQ...") or hex public key (eg: "0x9c2bf..."), received:';
      console.error('Error -', msg, accountAddressOrPublicKey, error);
      return null;
    }
  }

  static convertToAddress(accountAddressOrPublicKey: string) {
    try {
      return keyring.encodeAddress(accountAddressOrPublicKey);
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  static derivedSignerAddress(ethereumAddress: string): string {
    return this.convertToAddress(blake2AsHex(hexToU8a(ethereumAddress)));
  }

  static isAccountPK(accountString: string) {
    return isHex(accountString) && accountString.slice(0, 2) === '0x' && accountString.slice(2).length === 64;
  }
}
