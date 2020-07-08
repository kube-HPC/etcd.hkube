class JobStatusBase {
    constructor(options) {
        this.timestamp = new Date();
        this.jobId = options.jobId;
        this.pipeline = options.pipeline;
        this.data = options.data;
        this.status = options.status;
        this.error = options.error;
        this.nodeName = options.nodeName;
    }
}

module.exports = JobStatusBase;
