const Awt = require('./lib/awt.js');

class Apis {

    #avnApi;
    #awt;
    constructor(avnApi, awt, signerAddress) {
        this.#avnApi = avnApi;
        this.#awt = awt;
        this.signerAddress = signerAddress;
    }

    query = new Query(this.#avnApi, this.#awt)

    send = new Send(this.#avnApi, this.query(), this.#awt, signerAddress)

    poll = new Poll(this.#avnApi, this.#awt)
}

module.exports = Apis;