const path = require('path');
const { SUFFIX } = require('../consts');

class pipelineDriver {
    init(parent) {
        this.etcd = parent.etcd;
        this.services = parent.services;
    }

    async setTaskState(options) {
        const { jobId, taskId } = options;
        const suffix = path.join('/', SUFFIX.tasks, taskId);
        return this.services.set({ data: options.data, instanceId: jobId, suffix });
    }

    async getTaskState(options) {
        let results = null;
        try {
            const { jobId, taskId } = options;
            const suffix = path.join('/', SUFFIX.tasks, taskId);
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
            const suffix = path.join('/', SUFFIX.tasks);
            const result = await this.services.getList({ instanceId: jobId, suffix });

            results = Object.entries(result).map(([k, v]) => {
                const splitedKey = k.split('/');
                const taskId = splitedKey[splitedKey.length - 1];
                return { taskId, ...this.etcd._tryParseJSON(v) };
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
        const suffix = path.join('/', 'instance');
        return this.services.delete({ instanceId: jobId, suffix });
    }
}

module.exports = pipelineDriver;
