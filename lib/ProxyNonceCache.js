const common = require('./common.js');
const BN = require('bn.js');

const TX_PROCESSING_TIME_MS = 120000;
const NONCE_LOCK_POLL_INTERVAL_MS = 500;
const MAX_NONCE_LOCK_TIME_MS = TX_PROCESSING_TIME_MS + NONCE_LOCK_POLL_INTERVAL_MS;
const EXPIRY_UPDATE_ENUM = {
    DoNotUpade: false,
    UpdateExpiry: true
}

class ProxyNonceCache {
    constructor(cacheProvider) {
        this.cacheProvider = cacheProvider.connect();
    }

    async getNonceAndIncrement(signerAddress, nonceType) {
        console.log("getNonceAndIncrement called for ", signerAddress)
        common.validateNonceType(nonceType);
        signerAddress = common.convertToPublicKeyIfNeeded(signerAddress);

        const cachedNonceInfo = await this.cacheProvider.getNonceAndLock(signerAddress, nonceType);

        try {
            if (!cachedNonceInfo) {
                const nonceFromChain = parseInt(await queryApi.getNonce(signerAddress, nonceType));
                await this.cacheProvider.setNonce(signerAddress, nonceType, nonceFromChain);

                return nonceFromChain.toString()
            } else {
                if(cachedNonceInfo.lockAquired === false) {
                    console.log(`Nonce for ${signerAddress}, ${nonceType} is locked, waiting for it to be released...`);
                    cachedNonceInfo = await this.#waitForLockAndGetNonce(signerAddress, nonceType);
                }

                return await this.#validateNonceAndIncrement(signerAddress, nonceType, cachedNonceInfo.data);
            }
        } catch (err) {
            console.error(`Error getting nonce from cache: `, err.toString())
            throw err;
        } finally {
            // whatever happens, release the lock
            await this.cacheProvider.unlockNonce(signerAddress, nonceType)
        }
    }

    async #validateNonceAndIncrement(signerAddress, nonceType, nonceData) {
        const nonceIsExpired = Date.now() - nonceData.lastUpdated >= TX_PROCESSING_TIME_MS;

        if (nonceIsExpired) {
            return await this.#refreshNonceFromChain(signerAddress, nonceType, nonceData);
        } else {
            return await this.cacheProvider.incrementNonce(signerAddress, nonceType, EXPIRY_UPDATE_ENUM.UpdateExpiry);
        }
    }

    async #refreshNonceFromChain(signerAddress, nonceType, nonceData) {
        const nonceFromChain = parseInt(await queryApi.getNonce(signerAddress, nonceType));
        if (nonceData.lastUsedNonce === nonceFromChain) {
            // The chain should always be lastUsedNonce + 1 so do not reset yet, instead:
            //  - Ignore the nonce from chain
            //  - Do not update the expiry
            //  - Give a chance for the chain to create a block
            console.warn(`Nonce expired but on-chain nonce ${nonceFromChain} is the same as last nonce used ${nonceData.lastUsedNonce}.`);
            const nonce = await this.cacheProvider.incrementNonce(signerAddress, nonceType, EXPIRY_UPDATE_ENUM.DoNotUpade);
            await common.sleep(TX_PROCESSING_TIME_MS);

            return nonce;
        } else {
            await this.cacheProvider.setNonce(signerAddress, nonceType, nonceFromChain);
            return nonceFromChain.toString()
        }
    }

    // We wait for a maximum of MAX_NONCE_LOCK_TIME_MS until a nonce lock is released
    async #waitForLockAndGetNonce(signerAddress, nonceType) {
        for (i = 0; i < Math.ceil(MAX_NONCE_LOCK_TIME_MS / NONCE_LOCK_POLL_INTERVAL_MS); i++) {
            await sleep(NONCE_LOCK_POLL_INTERVAL_MS);
            // check if lock is released
            let nonceData = await this.cacheProvider.getNonce(signerAddress, nonceType);
            if (nonceData.locked === false) {
              return nonceData;
            }
        }

        throw new Error(`Timeout expired waiting for nonce to be unlocked. Signer: ${signerAddress}, nonceType: ${nonceType}.`)
    }
}

module.exports = ProxyNonceCache;