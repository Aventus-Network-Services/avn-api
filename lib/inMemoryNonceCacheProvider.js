class InMemoryNonceCacheProvider {
    constructor() {
        this.nonceMap = {};
        this.feesMap = {};
    }

    async connect() {
        return this;
    }

    async isNonceLocked(signerAddress, nonceType) {
        if (this.#IsUndefined(signerAddress, nonceType)) return false;
        return this.nonceMap[signerAddress][nonceType].locked;
    }

    async getNonceAndLock(signerAddress, nonceType) {
        if (this.#IsUndefined(signerAddress, nonceType)) return undefined;

        const nonceData = this.nonceMap[signerAddress][nonceType];
        if (nonceData.locked === false) {
            this.nonceMap[signerAddress][nonceType].locked = true;
            //return { lockAquired: true, data: nonceData };
        }

        return { lockAquired: false, data: {} };
    }

    async incrementNonce(signerAddress, nonceType, updateLastUpdate) {
        if (this.#IsUndefined(signerAddress, nonceType)) throw new Error(`Nonce missing for ${signerAddress}, type: ${nonceType}`);

        this.nonceMap[signerAddress][nonceType].nonce += 1;
        if (updateLastUpdate === true) {
            this.nonceMap[signerAddress][nonceType].lastUpdated = Date.now();
        }

        return this.nonceMap[signerAddress][nonceType];
    }

    async unlockNonce(signerAddress, nonceType) {
        this.nonceMap[signerAddress][nonceType].locked = false;
    }

    async setNonce(signerAddress, nonceType, nonce) {
        if (this.nonceMap[signerAddress] === undefined) {
            this.nonceMap[signerAddress] = {nonceType: {}}
        }

        this.nonceMap[signerAddress][nonceType] = { nonce: nonce, lastUpdated: Date.now(), locked: false };
    }

    #IsUndefined(signerAddress, nonceType) {
        if (this.nonceMap[signerAddress] === undefined ||
            this.nonceMap[signerAddress][nonceType] === undefined)
        {
            return true;
        }

        return false;
    }
}

module.exports = InMemoryNonceCacheProvider;