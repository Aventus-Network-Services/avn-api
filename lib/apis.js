const Query = require('./query.js');
const Send = require('./send.js');
const Poll = require('./poll.js');
class Apis {

    #avnApi;
    #awt;
    constructor(avnApi, awt, signerAddress) {
        console.log("Apis - AVN: ", avnApi)
        this.#avnApi = avnApi;
        this.#awt = awt;


        this.query = new Query(avnApi, this.#awt)
        this.send = new Send(avnApi, this.query, this.#awt, signerAddress)
        this.poll = new Poll(avnApi, this.#awt)
    }
}

module.exports = Apis;