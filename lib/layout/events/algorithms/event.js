const Event = require('../event');

class AlgorithmEvent extends Event {
    constructor(options) {
        super(options);
        this.algorithmName = options.algorithmName;
    }
}

module.exports = AlgorithmEvent;
