const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.STATE;
const schemas = require('./schema');

class JobState extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ ...l.data, jobId: l.jobId }));
    }
}

module.exports = JobState;
