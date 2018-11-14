
const Service = require('../service');
const Leaser = require('../lease/leaser');
const djsv = require('djsv');
const { registerSchema, watchSchema, getSchema, setSchema } = require('./schema');
const prefix = require('../consts').PREFIX.DISCOVERY;

class discovery extends Service {
    constructor(options) {
        super({ getSchema, setSchema, watchSchema, prefix, template: '{serviceName}/{instanceId}', ...options });
        this._registerSchema = djsv(registerSchema);
        this._serviceName = options.serviceName;
        this._instanceId = options.instanceId;
        this._leaser = new Leaser(options.client.client);
    }

    get(options) {
        let { instanceId, serviceName } = super.validateGet(options);
        serviceName = serviceName || this._serviceName;
        instanceId = instanceId || this._instanceId;
        return super.get({ instanceId, serviceName });
    }

    set(options) {
        let { instanceId, serviceName } = super.validateSet(options);
        serviceName = serviceName || this._serviceName;
        instanceId = instanceId || this._instanceId;
        return super.get({ instanceId, serviceName });
    }

    delete(options) {
        let { instanceId, serviceName } = super.validateSet(options);
        serviceName = serviceName || this._serviceName;
        instanceId = instanceId || this._instanceId;
        return super.delete({ instanceId, serviceName });
    }

    async list(options) {
        const list = await super.list(options);
        return list.map(l => ({ ...l.value, jobId: l.key }));
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
    register(options) {
        const schema = this._registerSchema(options);
        if (!schema.valid) {
            throw new Error(schema.error);
        }
        let { ttl, serviceName, instanceId } = schema.instance;
        serviceName = serviceName || this._serviceName;
        instanceId = instanceId || this._instanceId;
        const path = this.getPath({ serviceName, instanceId });
        return this._leaser.create(ttl, path, schema.instance);
    }

    /**
     * updating data for the current path 
     * @param {Object} data the updated date {}
     * @memberOf etcdDiscovery
     */
    updateRegisteredData(data) {
        return this._leaser.update(data);
    }

    singleWatch(options) {
        return this.watch({ ...options, lock: true });
    }

    watch(options) {
        const serviceName = options.serviceName || this._serviceName;
        const instanceId = options.instanceId || this._instanceId;
        return super.watch({ serviceName, instanceId });
    }

    unwatch(options) {
        return super.unwatch(options);
    }
}

module.exports = discovery;
