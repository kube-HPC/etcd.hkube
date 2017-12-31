const Etcd = require('node-etcd');
const { Etcd3 } = require('etcd3');
const etcd3Client = require('./etcd3-client')
const EventEmitter = require('events');
const djsv = require('djsv');
const discovery = require('./lib/discovery/discovery');
const services = require('./lib/services/services');
const jobs = require('./lib/jobs/jobs');
const jobResults = require('./lib/jobResults/jobResults');
const tasks = require('./lib/tasks/tasks');
const pipelines = require('./lib/pipelines/pipelines');
const execution = require('./lib/execution/execution');
const { registerSchema, watchSchema, initSchema, getSchema, setSchema, updateInitSchema } = require('./lib/schema');

class EtcdClient extends EventEmitter {

    constructor() {
        super();
        this.instanceId = '';
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
            this._etcdConfigPath = `${options.etcd.protocol}://${options.etcd.host}:${options.etcd.port}`;
            this.etcd3 = new etcd3Client({ hosts: this._etcdConfigPath });
            this._serviceName = options.serviceName;
            this._instanceId = options.instanceId;
            this.jobId = options.jobId;
            this.taskId = options.taskId;
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
            this._etcdConfigPath = `${options.etcd.protocol}://${options.etcd.host}:${options.etcd.port}`;
            this.etcd = new Etcd(this._etcdConfigPath);
            this._serviceName = options.serviceName;
            this._instanceId = options.instanceId;
            this.taskId = options.taskId;
            this.jobId = options.jobId;
        }
    }

    _tryParseJSON(json) {
        let parsed = json;
        try {
            parsed = JSON.parse(json);
        } catch (e) {
        }
        return parsed
    }
}

module.exports = EtcdClient;