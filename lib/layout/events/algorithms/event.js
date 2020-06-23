const Event = require('../event');

class AlgorithmEvent extends Event {
    constructor(options) {
        super(options);
        this.name = options.name;
    }
}

module.exports = AlgorithmEvent;
