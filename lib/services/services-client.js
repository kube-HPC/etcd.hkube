const djsv = require('djsv');
const { setSchema, getSchema } = require('../schema');
const path = require('path');
const { PREFIX } = require('../consts');

class ServicesClient {
    constructor(options) {
        this.setSchema = djsv(setSchema);
        this.getSchema = djsv(getSchema);
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
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
            const internalServiceName = serviceName || this._serviceName;
            const internalInstanceId = instanceId || this._instanceId;
            const _path = path.join('/', PREFIX.SERVICES, internalServiceName, internalInstanceId, suffix);
            result = await this._client.put(_path, data, null);
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
            const internalServiceName = serviceName || this._serviceName;
            const internalInstanceId = instanceId || this._instanceId;
            const _path = path.join('/', PREFIX.SERVICES, internalServiceName, internalInstanceId, suffix);
            result = await this._client.get(_path, { isPrefix: false });
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
            const internalServiceName = serviceName || this._serviceName;
            const internalInstanceId = instanceId || this._instanceId;
            const _path = path.join('/', PREFIX.SERVICES, internalServiceName, internalInstanceId, suffix);
            result = await this._client.get(_path);
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
            const internalServiceName = serviceName || this._serviceName;
            const _path = path.join('/', PREFIX.SERVICES, internalServiceName, instanceId, suffix);
            result = await this._client.delete(_path, { isPrefix: true });
        }
        return result;
    }
}

module.exports = ServicesClient;
