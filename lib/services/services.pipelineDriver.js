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
    // path: "/services/pipeline-driver/<jobID>/tasks/<taskID>/info"
    async setTaskState(taskId, data) {
        let suffix = path.join('/', SUFFIX.tasks, taskId, 'info');
        return await this.services.set({ data, instanceId: this.etcd._jobId, suffix })
    }
    // path: "/services/pipeline-driver/<jobID>/tasks/<taskID>/info"

    async getTaskState(taskId) {
        let suffix = path.join('/', SUFFIX.tasks, taskId, 'info');
        return await this.services.get({  instanceId: this.etcd._jobId, suffix })

    }
    // path: "/services/pipeline-driver/<jobID>/tasks/"
    async getTasks() {
        let suffix = path.join('/', SUFFIX.tasks);
        return await this.services.get({ data, instanceId: this.etcd._jobId, suffix })

    }



}


module.exports = pipelineDriver;