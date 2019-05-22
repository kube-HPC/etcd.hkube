
class Webhook {
    constructor(option) {
        const options = option || {};
        this.jobId = options.jobId;
        this.type = options.type;
        this.timestamp = new Date();
        this.url = options.url;
        this.pipelineStatus = options.pipelineStatus;
        this.responseStatus = options.responseStatus;
        this.httpResponse = options.httpResponse;
        this.status = options.status;
    }
}

module.exports = Webhook;
