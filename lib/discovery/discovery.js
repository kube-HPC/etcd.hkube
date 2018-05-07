
const path = require('path');
const Watcher = require('../watch/watcher');
const djsv = require('djsv');
const { registerSchema, watchSchema, discoveryGetSchema } = require('../schema');
const EventEmitter = require('events');
const { PREFIX } = require('../consts');

class discovery extends EventEmitter {
    constructor() {
        super();
        this.registerSchema = djsv(registerSchema);
        this.watchSchema = djsv(watchSchema);
        this.getSchema = djsv(discoveryGetSchema);
    }

    init(options) {
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._client = options.client;
        this._watcher = new Watcher(options.client);
    }

    /**
     *  the start method used for begin storing data 
     * @param {object} options 
     * @param {integer}options.ttl  time to live in etcd
     * @param {object} options.data  object that need to be stored in etcd if update is needed use update function
     * @param {string} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * 
     * @memberOf EtcdDiscovery
     */
    async register(options) {
        const schema = this.registerSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        if (schema.valid) {
            const { ttl, data, instanceId } = schema.instance;
            const internalInstanceId = instanceId || this._instanceId;
            const registerPath = path.join('/', PREFIX.DISCOVERY, this._serviceName, internalInstanceId);
            return this._client.register(ttl, registerPath, data);
        }
    }

    /**
     * updating data for the current path 
     * @param {Object} data the updated date {}
     * @memberOf etcdDiscovery
     */
    async updateRegisteredData(data) {
        return this._client.updateRegisteredData(data);
    }

    /**
     * watch notification for messages returns object with the current value and watch object
     * that can be used as follows 
     * watcher.on('change'/'expire'/'delete',data => {
     *    console.log('Value changed; new value: ', node);
     *   })
     * @param {object} options 
     * @param {string} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * @param {bool}options.etcdConfig.wait (bool, wait for changes to key)
     * @param {integer}options.etcdConfig.waitIndex (wait for changes after given index)

     * @memberOf EtcdDiscovery
     */
    async watch(options) {
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { serviceName, instanceId } = schema.instance;
        const internalServiceName = serviceName || this._serviceName;
        const _path = path.join('/', PREFIX.DISCOVERY, internalServiceName, instanceId);
        const watch = await this._watcher.watch(_path);
        watch.watcher.on('put', (res) => {
            const [, , jobId, , taskId] = res.key.toString().split('/');
            const data = { ...JSON.parse(res.value.toString()), taskId, jobId };
            this.emit('change', data);
        });
        return watch.data;
    }

    async unwatch(options) {
        options = options || {};
        const schema = this.watchSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        const { serviceName, instanceId } = schema.instance;
        const internalServiceName = serviceName || this._serviceName;
        const _path = path.join('/', PREFIX.DISCOVERY, internalServiceName, instanceId);
        return this._watcher.unwatch(_path);
    }
    /**
     * 
     * @param {Object} options 
     * @param {string} [options.serviceName] the service name registered during init of the required service. Defaults to the own discovery serviceName
     * @param {string} [options.instanceId] the specific instance id. If not specified, returns get by prefix 
     */
    async get(options) {
        let result = null;
        const schema = this.getSchema(options);
        if (schema.valid) {
            const { instanceId, serviceName } = schema.instance;
            const internalServiceName = serviceName || this._serviceName;
            const _path = path.join('/', PREFIX.DISCOVERY, internalServiceName, instanceId);
            result = await this._client.get(_path, { isPrefix: !instanceId });
            for (const key in result) { // eslint-disable-line no-restricted-syntax,guard-for-in
                try {
                    result[key] = JSON.parse(result[key]);
                }
                catch (e) { // eslint-disable-line 

                }
            }
        }
        return result;
    }
}
module.exports = discovery;
