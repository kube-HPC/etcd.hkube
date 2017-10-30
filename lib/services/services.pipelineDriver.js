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
    async setTaskState(taskId, data) {
        const suffix = path.join('/', SUFFIX.tasks, taskId);
        return await this.services.set({ data, instanceId: this.etcd.jobId, suffix })
    }

    // path: "/services/pipeline-driver/<jobID>/tasks/<taskID>"
    async getTaskState(taskId) {
        let results = null;
        try {
            const suffix = path.join('/', SUFFIX.tasks, taskId);
            const res = await this.services.get({ instanceId: this.etcd.jobId, suffix });
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

    async getDriverTasks() {
        let results = null;
        try {
            const suffix = path.join('/', SUFFIX.tasks);
            const result = await this.services.get({ instanceId: this.etcd.jobId, suffix });
            results = result.node.nodes.map(node => {
                const taskID = node.key.substr(node.key.indexOf('/tasks') + 7);
                return Object.assign({}, { taskID: taskID }, this.etcd._tryParseJSON(node.value));
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

    async getState() {
        let results = null;
        try {
            const suffix = path.join('/', 'instance');
            const result = await this.services.get({ instanceId: this.etcd.jobId, suffix });
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

    async setState(data) {
        let suffix = path.join('/', 'instance');
        return await this.services.set({ instanceId: this.etcd.jobId, suffix, data });
    }

    async deleteState() {
        return await this.services.delete({ instanceId: this.etcd.jobId });
    }
}


module.exports = pipelineDriver;