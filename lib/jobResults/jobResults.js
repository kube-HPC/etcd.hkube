const Service = require('../service');
const template = require('../templates').TEMPLATES.JOB_RESULTS;
const schemas = require('./schema');

class JobResults extends Service {
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
        return list.map(l => ({ jobId: l.jobId, ...l.value }));
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

module.exports = JobResults;

