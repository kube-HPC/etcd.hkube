const Event = require('../event');

class PipelineEvent extends Event {
    constructor(options) {
        super(options);
        this.pipelineName = options.pipelineName;
    }
}

module.exports = PipelineEvent;
