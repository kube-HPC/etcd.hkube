
class JobStatusBase {
    constructor(options) {
        this.timestamp = new Date();
        this.pipeline = options.pipeline;
        this.data = options.data;
        this.status = options.status;
        this.error = options.error;
    }
}

module.exports = JobStatusBase;