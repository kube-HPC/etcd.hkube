const Service = require('../service');
const prefix = require('../consts').PREFIX.RUNNING_PIPELINES;
const { getSchema, setSchema, deleteSchema, watchSchema } = require('./schema');

class RunningPipelines extends Service {
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
        return list.map(l => ({ ...l.value, jobId: l.key }));
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

module.exports = RunningPipelines;
