const Service = require('../../../core/service');
const template = require('../../../core/templates').TEMPLATES.JOBS.TASKS;
const schemas = require('./schema');

class Tasks extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ ...l.value, jobId: l.jobId, taskId: l.taskId }));
    }
}

module.exports = Tasks;
