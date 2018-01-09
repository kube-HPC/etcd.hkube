const djsv = require('djsv');
const { setSchema, getSchema } = require('../schema');
const path = require('path');
const { PREFIX } = require('../consts');
const PipelineDriver = require('./pipeline-driver');
const AlgorithmQueue = require('./algorithm-queue');

class services {
    constructor() {
        this.setSchema = djsv(setSchema);
        this.getSchema = djsv(getSchema);
        this.pipelineDriver = new PipelineDriver();
        this.algorithmQueue = new AlgorithmQueue();
    }

    init(parent) {
        this.parent = parent;
        this.pipelineDriver.init({ etcd: this.parent, services: this });
        this.algorithmQueue.init({ etcd: this.parent, services: this });
        this.etcd = this.parent.etcd3;
    }

    /**
     *  the start method used for begin storing data 
     * @param {object} options 
     * @param {object} options.data  object that need to be stored in etcd if update is needed use update function
     * @param {string} options.serviceName the path that will be store on etcd if not assigned than it gets the one from the init
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * @param {string} options.suffix suffix can be service or discovery or just ''
     * @memberOf EtcdDiscovery
     */
    async set(options) {
        let result = null;
        const schema = this.setSchema(options);
        if (schema.valid) {
            const {
                data, instanceId, serviceName, suffix
            } = schema.instance;
            const internalServiceName = serviceName || this.parent._serviceName;
            const internalInstanceId = instanceId || this.parent._instanceId;
            const _path = path.join('/', PREFIX.SERVICES, internalServiceName, internalInstanceId, suffix);
            result = await this.etcd.put(_path, data, null);
        }
        return result;
    }

    /**
     * get the current messages returns object with the current value and watch object
     * 
     * @param {object} options 
     * @param {string} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * @param {string} options.prefix prefix can be service or discovery or just ''
     * @param {string} options.suffix suffix can be service or discovery or just ''
     * @param {any} options.etcdOptions etcd options the default is  {recursive: true}
     * @param {bool}options.etcdOptions.recursive (bool, list all values in directory recursively)
     * @param {bool}options.etcdOptions.wait (bool, wait for changes to key)
     * @param {integer}options.etcdConfig.waitIndex (wait for changes after given index)
 
     * 
     * @memberOf EtcdDiscovery
     */

    async get(options) {
        let result = null;
        const schema = this.getSchema(options);
        if (schema.valid) {
            const {
                serviceName, instanceId, suffix
            } = schema.instance;
            const internalServiceName = serviceName || this.parent._serviceName;
            const internalInstanceId = instanceId || this.parent._instanceId;
            const _path = path.join('/', PREFIX.SERVICES, internalServiceName, internalInstanceId, suffix);
            result = await this.etcd.get(_path, { isPrefix: false });
        }
        return result;
    }

    async getList(options) {
        let result = null;
        const schema = this.getSchema(options);
        if (schema.valid) {
            const {
                serviceName, instanceId, suffix
            } = schema.instance;
            const internalServiceName = serviceName || this.parent._serviceName;
            const internalInstanceId = instanceId || this.parent._instanceId;
            const _path = path.join('/', PREFIX.SERVICES, internalServiceName, internalInstanceId, suffix);
            result = await this.etcd.get(_path);
        }
        return result;
    }

    async delete(options) {
        let result = null;
        const schema = this.getSchema(options);
        if (schema.valid) {
            const {
                serviceName, instanceId, suffix
            } = schema.instance;
            const internalServiceName = serviceName || this.parent._serviceName;
            const _path = path.join('/', PREFIX.SERVICES, internalServiceName, instanceId, suffix);
            result = await this.etcd.delete(_path);
        }
        return result;
    }
}

module.exports = services;
