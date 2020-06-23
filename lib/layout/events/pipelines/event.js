const Event = require('../event');

class PipelineEvent extends Event {
    constructor(options) {
        super(options);
        this.name = options.name;
    }
}

module.exports = PipelineEvent;
