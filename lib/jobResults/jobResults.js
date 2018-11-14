const Service = require('../service');
const prefix = require('../consts').PREFIX.JOB_RESULTS;
const { getSchema, setSchema, deleteSchema, watchSchema } = require('./schema');

class JobResults extends Service {
    constructor(options) {
        super({ getSchema, setSchema, deleteSchema, watchSchema, prefix, template: '{jobId}', ...options });
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
        return list.map(l => ({ jobId: l.key, ...l.value }));
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    releaseChangeLock(jobId) {
        this._locker.release('change', [jobId]);
    }

    releaseDeleteLock(jobId) {
        this._locker.release('delete', [jobId]);
    }

    watch(options) {
        return super.watch(options);
    }

    unwatch(options) {
        return super.unwatch(options);
    }
}

module.exports = JobResults;

