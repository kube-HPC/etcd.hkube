const djsv = require('djsv');
const { registerSchema, watchSchema } = require('../schema');
const EventEmitter = require('events');
const path = require('path');
const { PREFIX, SUFFIX } = require('../consts');

class pipelineDriver {

    constructor() {
    }

    init(parent) {
        this.etcd = parent.etcd;
        this.services = parent.services;
    }

    // path: "/services/pipeline-driver/<jobID>/tasks/<taskID>"
    async setTaskState(options) {
        const { jobId, taskId } = options;
        const suffix = path.join('/', SUFFIX.tasks, taskId);
        return await this.services.set({ data: options.data, instanceId: jobId, suffix })
    }

    // path: "/services/pipeline-driver/<jobID>/tasks/<taskID>"
    async getTaskState(options) {
        let results = null;
        try {
            const { jobId, taskId } = options;
            const suffix = path.join('/', SUFFIX.tasks, taskId);
            return await this.services.get({ instanceId: jobId, suffix });
        }
        catch (error) {
            if (error.errorCode === 100) {
                return null;
            }
            throw error;
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
                let splitedKey = k.split(`/`);
                const taskId = splitedKey[splitedKey.length - 1];
                return { taskId, ...this.etcd._tryParseJSON(v) }
            });
        }
        catch (error) {
            if (error.errorCode === 100) {
                return null;
            }
            throw error;
        }
        return results;
    }

    async getState(options) {
        let results = null;
        try {
            const { jobId } = options;
            const suffix = path.join('/', 'instance');
            const result = await this.services.get({ instanceId: jobId, suffix });
            results = this.etcd._tryParseJSON(result.node.value);
        }
        catch (error) {
            if (error.errorCode === 100) {
                return null;
            }
            throw error;
        }
        return results;
    }

    async setState(options) {
        const suffix = path.join('/', 'instance');
        const { jobId } = options;
        return await this.services.set({ instanceId: jobId, suffix, data: options.data });
    }

    async deleteState(options) {
        const { jobId } = options;
        return await this.services.delete({ instanceId: jobId });
    }
}


module.exports = pipelineDriver;