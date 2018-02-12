
const djsv = require('djsv');
const { registerSchema, watchSchema } = require('../schema');
const EventEmitter = require('events');
const path = require('path');
const { PREFIX } = require('../consts');

class discovery extends EventEmitter {
    constructor() {
        super();
        this.registerSchema = djsv(registerSchema);
        this.watchSchema = djsv(watchSchema);
    }

    init(parent) {
        this.parent = parent;
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
        const result = this.registerSchema(options);
        if (result.valid) {
            const {
                ttl, data, instanceId
            } = result.instance;
            const internalInstanceId = instanceId || this.parent._instanceId;
            this._registerPath = path.join('/', PREFIX.DISCOVERY, this.parent._serviceName, internalInstanceId);
            return this.parent.etcd3.register(ttl, this._registerPath, data);
        }
        throw new Error(result.error);
    }

    /**
     * updating data for the current path 
     * @param {Object} data the updated date {}
     * @memberOf etcdDiscovery
     */
    async updateRegisteredData(data) {
        return this.parent.etcd3.updateRegisteredData(this._registerPath, data);
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
     * @param {any} options.etcdOptions etcd options the default is  {wait: true}
     * @param {bool}options.etcdConfig.recursive (bool, list all values in directory recursively)
     * @param {bool}options.etcdConfig.wait (bool, wait for changes to key)
     * @param {integer}options.etcdConfig.waitIndex (wait for changes after given index)

     * @memberOf EtcdDiscovery
     */
    async watch(options) {
        //  return new Promise((res, rej) => {
        const result = this.watchSchema(options);
        if (result.valid) {
            const {
                serviceName, instanceId
            } = result.instance;
            const internalServiceName = serviceName || this.parent._serviceName;
            const _path = path.join('/', PREFIX.DISCOVERY, internalServiceName, instanceId);
            return this.parent.etcd3.getAndWatch(_path);
        }
    }
}
module.exports = discovery;
