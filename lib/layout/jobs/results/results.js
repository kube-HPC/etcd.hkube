const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.RESULTS;
const JobResult = require('../entities/job-result');
const schemas = require('./schema');

class JobResults extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    set(options) {
        const data = new JobResult(options.data);
        return super.set({ ...options, data });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ jobId: l.jobId, ...l.data }));
    }
}

module.exports = JobResults;
