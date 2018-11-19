const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.RUNNING_PIPELINES;
const schemas = require('./schema');

class RunningPipelines extends Service {
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
        return list.map(l => ({ ...l.value, jobId: l.jobId }));
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    releaseChangeLock(options) {
        super.releaseChangeLock(options);
    }

    releaseDeleteLock(options) {
        super.releaseDeleteLock(options);
    }

    watch(options) {
        return super.watch(options);
    }

    unwatch(options) {
        return super.unwatch(options);
    }
}

module.exports = RunningPipelines;
