const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.RESULTS;
const schemas = require('./schema');
const JobResult = require('../base/job-result');

class JobResults extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ jobId: l.jobId, ...l.data }));
    }

    set(options) {
        const data = new JobResult(options.data);
        return super.set({ ...options, data });
    }

    update(options) {
        const data = new JobResult(options.data);
        return super.update({ ...options, data });
    }
}

module.exports = JobResults;

