const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.EXECUTIONS.RUNNING;
const schemas = require('./schema');

class RunningPipelines extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ ...l.data, jobId: l.jobId }));
    }
}

module.exports = RunningPipelines;
