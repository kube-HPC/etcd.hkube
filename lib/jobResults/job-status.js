const JobStatusBase = require('./job-result-base');

class JobStatus extends JobStatusBase {
    constructor(options) {
        super(options);
        this.level = options.level;
    }
}

module.exports = JobStatus;
