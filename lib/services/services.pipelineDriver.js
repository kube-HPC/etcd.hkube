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
            const res = await this.services.get({ instanceId: jobId, suffix });
            results = this.etcd._tryParseJSON(res.node.value)
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
            const result = await this.services.get({ instanceId: jobId, suffix });
            results = result.node.nodes.map(node => {
                const taskId = node.key.substr(node.key.indexOf('/tasks') + 7);
                return Object.assign({}, { taskId }, this.etcd._tryParseJSON(node.value));
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
        const { jobId } = options;
        const suffix = path.join('/', 'instance');
        return await this.services.set({ instanceId: jobId, suffix, data: options.data });
    }

    async deleteState(options) {
        const { jobId } = options;
        return await this.services.delete({ instanceId: jobId });
    }
}


module.exports = pipelineDriver;