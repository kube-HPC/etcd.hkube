const path = require('path');
const jsonHelper = require('../helper/json');
const PREFIX = require('../consts').PREFIX.TASKS;

class PipelineDriver {
    init(options) {
        this.services = options;
    }

    async setTaskState(options) {
        const { jobId, taskId } = options;
        const suffix = path.join('/', PREFIX, taskId);
        return this.services.set({ data: options.data, instanceId: jobId, suffix });
    }

    async getTaskState(options) {
        let results = null;
        try {
            const { jobId, taskId } = options;
            const suffix = path.join('/', PREFIX, taskId);
            results = await this.services.get({ instanceId: jobId, suffix });
        }
        catch (error) {
            if (error.errorCode !== 100) {
                throw error;
            }
        }
        return results;
    }

    async getDriverTasks(options) {
        let results = null;
        try {
            const { jobId } = options;
            const suffix = path.join('/', PREFIX);
            const result = await this.services.getList({ instanceId: jobId, suffix });

            results = Object.entries(result).map(([k, v]) => {
                const splitedKey = k.split('/');
                const taskId = splitedKey[splitedKey.length - 1];
                return { taskId, ...jsonHelper.tryParseJSON(v) };
            });
        }
        catch (error) {
            if (error.errorCode !== 100) {
                throw error;
            }
        }
        return results;
    }

    async getState(options) {
        const { jobId } = options;
        const suffix = path.join('/', 'instance');
        return this.services.get({ instanceId: jobId, suffix });
    }

    async setState(options) {
        const { jobId, data } = options;
        const suffix = path.join('/', 'instance');
        return this.services.set({ instanceId: jobId, suffix, data });
    }

    async deleteState(options) {
        const { jobId } = options;
        return this.services.delete({ instanceId: jobId });
    }
}

module.exports = PipelineDriver;
