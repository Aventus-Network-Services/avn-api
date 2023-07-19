'use strict';

import * as common from './common.js';
import { mnemonicGenerate, mnemonicToMiniSecret } from '@polkadot/util-crypto';
import { u8aToHex, isHex } from '@polkadot/util';
import { AvnAccount, Signer } from '../interfaces/index.js';

export default class Utils {
    static generateNewAccount(): AvnAccount {
        const mnemonic = mnemonicGenerate();
        const keyPair = common.keyring.createFromUri(mnemonic);
        const account = {
          mnemonic,
          seed: u8aToHex(mnemonicToMiniSecret(mnemonic)),
          address: keyPair.address,
          publicKey: u8aToHex(keyPair.publicKey)
        };
        return account;
    }

    static addressToPublicKey(address: string): string {
        common.validateAccount(address);
        return common.convertToPublicKeyIfNeeded(address);
    }

    static  publicKeyToAddress(accountAddressOrPublicKey: string): string {
        return common.convertToAddress(accountAddressOrPublicKey);
    }

    static  addressToPublicKeyBytes(address: string): Uint8Array {
        common.validateAccount(address);
        return common.convertToPublicKeyBytes(address);
    }

    static  convertToHexIfNeeded(input: string | Uint8Array): string {
        if (isHex(input)) {
          return input.toLowerCase();
        }

        return u8aToHex(input).toLowerCase();
    }

    static  getSigner(suri: string): Signer {
        if (!suri) throw new Error('Unable to get signer because Suri is not defined');
        const user = common.keyring.addFromUri(suri);
        return {
          sign: async (data, _signerAddress) => await u8aToHex(user.sign(data)),
          address: user.address
        };
    }
}
