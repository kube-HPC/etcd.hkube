const Etcd = require('node-etcd');
const EventEmitter = require('events');
const djsv = require('djsv');
const discovery = require('./discovery');
const services = require('../services/services');
const jobs = require('../jobs/jobs');
const jobResults = require('../jobResults/jobResults');
const tasks = require('../tasks/tasks');
const pipelines = require('../pipelines/pipelines');
const execution = require('../execution/execution');
const { registerSchema, watchSchema, initSchema, getSchema, setSchema, updateInitSchema } = require('../schema');

class EtcdDiscovery extends EventEmitter {

    constructor() {
        super();
        this.instanceId = ''
        this.registerSchema = djsv(registerSchema);
        this.watchSchema = djsv(watchSchema);
        this.initSchema = djsv(initSchema);
        this.getSchema = djsv(getSchema);
        this.setSchema = djsv(setSchema);
        this.discovery = new discovery();
        this.services = new services();
        this.jobs = new jobs();
        this.jobResults = new jobResults();
        this.tasks = new tasks();
        this.pipelines = new pipelines();
        this.execution = new execution();
    }

    /**
     * init data for starting
     * @param {object} options 
     * @param {object} options.etcd contains object for connection {protocol:host:"host ip", port:"port"} 
     * @param {string} options.etcd.protocol protocol http or https 
     * @param {string} options.etcd.host host can be name or ip 
     * @param {integer} options.etcd.port port number 
     * @param {object} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
     * @param {object} options.taskId workerID
     * @param {object} options.jobId the pipeline instanceID
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * @memberOf etcdDiscovery
     */
    async init(options) {
        this._options = options;
        let initSchemaConfig = this.initSchema(options);
        if (initSchemaConfig.valid) {
            this._etcdConfigPath = `${initSchemaConfig.instance.etcd.protocol}://${initSchemaConfig.instance.etcd.host}:${initSchemaConfig.instance.etcd.port}`;
            this.etcd = new Etcd(this._etcdConfigPath);
            this._serviceName = initSchemaConfig.instance.serviceName;
            this._instanceId = initSchemaConfig.instance.instanceId;
            this.jobId = initSchemaConfig.instance.jobId;
            this.taskId = initSchemaConfig.instance.taskId;
            this.discovery.init(this);
            this.services.init(this);
            this.jobs.init(this);
            this.jobResults.init(this);
            this.tasks.init(this);
            this.pipelines.init(this);
            this.execution.init(this);
            return this;
        } else {
            throw new Error(initSchemaConfig.error)
        }
    }

    /**
     * init data for starting
     * @param {object} options 
     * @param {object} options.etcd contains object for connection {protocol:host:"host ip", port:"port"} 
     * @param {string} options.etcd.protocol protocol http or https 
     * @param {string} options.etcd.host host can be name or ip 
     * @param {integer} options.etcd.port port number 
     * @param {object} options.serviceName the path that will be store on etcd from a const file that contains etcd names 
     * @param {object} options.taskId workerID
     * @param {object} options.jobId the pipeline instanceID
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * @memberOf etcdDiscovery
     */
    async updateInitSetting(options) {
        let tempSchema = updateInitSchema(this._options);
        const updateInitSchemaConfig = djsv(tempSchema, options);
        // let updateInitSchemaConfig = this.updateInitSchema();
        if (updateInitSchemaConfig.valid) {
            this._etcdConfigPath = `${updateInitSchemaConfig.instance.etcd.protocol}://${updateInitSchemaConfig.instance.etcd.host}:${updateInitSchemaConfig.instance.etcd.port}`;
            this.etcd = new Etcd(this._etcdConfigPath);
            this._serviceName = updateInitSchemaConfig.instance.serviceName;
            this._instanceId = updateInitSchemaConfig.instance.instanceId;
            this.taskId = updateInitSchemaConfig.instance.taskId;
            this.jobId = updateInitSchemaConfig.instance.jobId;
        }
    }

    async _keyRegister(etcdPath, ttl, data) {
        return new Promise((resolve, reject) => {
            this.etcd.set(etcdPath,
                JSON.stringify(data), { ttl }, (err, res) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(res);
                })
        });
    }

    _tryParseJSON(json) {
        let parsed = json;
        try {
            parsed = JSON.parse(json);
        } catch (e) {
        }
        return parsed
    }

    _schemaError(error) {
        let parsed = json;
        try {
            parsed = JSON.parse(json);
        } catch (e) {
        }
        return parsed
    }
}

module.exports = EtcdDiscovery;