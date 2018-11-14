const Service = require('../service');
const prefix = require('../consts').PREFIX.JOBS;
const { getSchema, setSchema, deleteSchema, watchSchema } = require('./schema');

class Jobs extends Service {
    constructor(options) {
        super({ getSchema, setSchema, deleteSchema, watchSchema, prefix, template: '{jobId}', ...options });
    }

    getState(options) {
        const { jobId, suffix } = super.validateGet(options);
        return super.get({ jobId, suffix });
    }

    setState(options) {
        const { jobId, suffix } = super.validateSet(options);
        return super.set({ data: { state: options.state }, jobId, suffix });
    }

    stop(options) {
        const { jobId, suffix } = super.validateSet(options);
        return super.set({ data: { state: 'stop', reason: options.reason }, jobId, suffix });
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

module.exports = Jobs;
