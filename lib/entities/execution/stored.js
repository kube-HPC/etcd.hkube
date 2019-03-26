const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.EXECUTIONS.STORED;
const schemas = require('./schema');

class Execution extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ ...l.value, jobId: l.jobId }));
    }
}

module.exports = Execution;
