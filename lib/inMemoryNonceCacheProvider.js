class InMemoryNonceCacheProvider {
    constructor() {
        this.nonceMap = {};
        this.feesMap = {};
    }

    async connect() {
        console.log("connect called")
        return this;
    }

    async getNonce(signerAddress, nonceType) {
        console.log(`[getNonce] -  ${signerAddress}, nonceType: ${nonceType}`)

        if (this.#IsUndefined(signerAddress, nonceType)) return undefined;

        console.log(" - [getNonce]: ", this.nonceMap[signerAddress][nonceType])
        return this.nonceMap[signerAddress][nonceType];
    }

    async getNonceAndLock(signerAddress, nonceType) {
        console.log(`[getNonceAndLock] -  ${signerAddress}, nonceType: ${nonceType}`)

        if (this.#IsUndefined(signerAddress, nonceType)) return undefined;

        const nonceData = this.nonceMap[signerAddress][nonceType];
        if (nonceData.locked === false) {
            this.nonceMap[signerAddress][nonceType].locked = true;
            console.log(" - [getNonceAndLock]: ", { lockAquired: true, data: nonceData })
            return { lockAquired: true, data: nonceData };
        }

        console.log(" - [getNonceAndLock]: ", { lockAquired: false, data: {} })
        return { lockAquired: false, data: {} };
    }

    async incrementNonce(signerAddress, nonceType, updateLastUpdate) {
        console.log(`[incrementNonce] -  ${signerAddress}, nonceType: ${nonceType}, update: ${updateLastUpdate}`)
        if (this.#IsUndefined(signerAddress, nonceType)) throw new Error(`Nonce missing for ${signerAddress}, type: ${nonceType}`);

        this.nonceMap[signerAddress][nonceType].nonce = this.nonceMap[signerAddress][nonceType].nonce + 1;
        if (updateLastUpdate === true) {
            this.nonceMap[signerAddress][nonceType].lastUpdated = Date.now();
        }

        console.log(" - [incrementNonce]: ", this.nonceMap[signerAddress][nonceType])
        return this.nonceMap[signerAddress][nonceType];
    }

    async unlockNonce(signerAddress, nonceType) {
        console.log(`[unlockNonce] -  ${signerAddress}, nonceType: ${nonceType}`)
        this.nonceMap[signerAddress][nonceType].locked = false;
    }

    async setNonce(signerAddress, nonceType, nonce) {
        console.log(`[setNonce] -  ${signerAddress}, nonceType: ${nonceType}, nonce: ${nonce}`)
        if (this.nonceMap[signerAddress] === undefined) {
            this.nonceMap[signerAddress] = {nonceType: {}}
        }

        this.nonceMap[signerAddress][nonceType] = { nonce: nonce, lastUpdated: Date.now(), locked: false };
        console.log(" - [setNonce]: ", this.nonceMap[signerAddress][nonceType])
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