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
        console.log("getNonce called for ", signerAddress, nonceType)

        if (this.nonceMap[signerAddress] === undefined || this.nonceMap[signerAddress][nonceType] === undefined) return undefined;

        return this.nonceMap[signerAddress][nonceType];
    }

    async getNonceAndLock(signerAddress, nonceType) {
        console.log("getNonceAndLock called for ", signerAddress, nonceType)

        if (this.nonceMap[signerAddress] === undefined || this.nonceMap[signerAddress][nonceType] === undefined) return undefined;


        const nonceData = this.nonceMap[signerAddress][nonceType];
        if (nonceData.locked === false) {
            this.nonceMap[signerAddress][nonceType].locked = true;
            return { lockAquired: true, data: nonceData };
        }

        return { lockAquired: false, data: {} };
    }

    async incrementNonce(signerAddress, nonceType, updateLastUpdate) {
        console.log("incrementNonce called for ", signerAddress, nonceType, updateLastUpdate)

        this.nonceMap[signerAddress][nonceType].lastUsedNonce = this.nonceMap[signerAddress][nonceType].lastUsedNonce + 1;
        if (updateLastUpdate === true) {
            this.nonceMap[signerAddress][nonceType].lastUpdated = Date.now();
        }

        return this.nonceMap[signerAddress][nonceType];
    }

    async unlockNonce(signerAddress, nonceType) {
        console.log("unlockNonce called for ", signerAddress, nonceType)
        this.nonceMap[signerAddress][nonceType].locked = false;
    }

    async setNonce(signerAddress, nonceType, nonce) {
        console.log("resetNonce called for ", signerAddress, nonceType)
        if (this.nonceMap[signerAddress] === undefined) {
            this.nonceMap[signerAddress] = {nonceType: {}}
        }

        this.nonceMap[signerAddress][nonceType] = { lastUsedNonce: nonce, lastUpdated: Date.now(), locked: false };
        console.log("\n\n***Updated nonce cache: ", this.nonceMap[signerAddress][nonceType])
    }
}

module.exports = InMemoryNonceCacheProvider;