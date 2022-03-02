const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.RESULTS;
const JobResult = require('../entities/job-result');
const schemas = require('./schema');

class JobResults extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async set(options) {
        const data = new JobResult(options);
        return super.set(data);
    }
}

module.exports = JobResults;
