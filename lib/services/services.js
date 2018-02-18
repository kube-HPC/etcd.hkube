const djsv = require('djsv');
const { setSchema, getSchema } = require('../schema');
const path = require('path');
const { PREFIX } = require('../consts');
const ServicesClient = require('./services-client');
const PipelineDriver = require('./pipeline-driver');
const AlgorithmQueue = require('./algorithm-queue');

class Services {
    constructor() {
        this.setSchema = djsv(setSchema);
        this.getSchema = djsv(getSchema);
        this.pipelineDriver = new PipelineDriver();
        this.algorithmQueue = new AlgorithmQueue();
    }

    init(options) {
        this.client = new ServicesClient(options);
        this.pipelineDriver.init(this.client);
        this.algorithmQueue.init(this.client);
    }
}

module.exports = Services;
