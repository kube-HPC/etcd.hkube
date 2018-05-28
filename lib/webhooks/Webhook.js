
class Webhook {
    constructor(options) {
        options = options || {};
        this.timestamp = new Date();
        this.url = options.url;
        this.pipelineStatus = options.pipelineStatus;
        this.responseStatus = options.responseStatus;
        this.httpResponse = options.httpResponse;
    }
}

module.exports = Webhook;