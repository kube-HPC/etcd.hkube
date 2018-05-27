
class Webhook {
    constructor(options) {
        this.timestamp = new Date();
        this.url = options.url;
        this.pipelineStatus = options.pipelineStatus;
        this.responseStatus = options.responseStatus;
        this.httpResponse = options.httpResponse;
        this.state = options.state;
        this.type = options.type;
    }
}

module.exports = Webhook;
