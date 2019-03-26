const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.RESULTS;
const schemas = require('./schema');

class JobResults extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ jobId: l.jobId, ...l.value }));
    }
}

module.exports = JobResults;

