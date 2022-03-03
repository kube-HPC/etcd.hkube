const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.STATUS;
const JobStatus = require('../entities/job-status');
const schemas = require('./schema');

class JobsStatus extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    set(options) {
        const data = new JobStatus(options);
        return super.set(data);
    }
}

module.exports = JobsStatus;
