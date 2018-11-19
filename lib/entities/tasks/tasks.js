const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.TASKS;
const schemas = require('./schema');

class Tasks extends Service {
    constructor(options) {
        super({ ...schemas, template, ...options });
    }

    get(options) {
        return super.get(options);
    }

    set(options) {
        return super.set(options);
    }

    delete(options) {
        return super.delete(options);
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ ...l.value, jobId: l.jobId, taskId: l.taskId }));
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    watch(options) {
        return super.watch(options);
    }

    unwatch(options) {
        return super.unwatch(options);
    }
}

module.exports = Tasks;
