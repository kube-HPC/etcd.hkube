const Etcd3Client = require('./etcd3-client');
const EventEmitter = require('events');
const djsv = require('djsv');
const Discovery = require('./lib/discovery/discovery');
const Services = require('./lib/services/services');
const Jobs = require('./lib/jobs/jobs');
const JobResults = require('./lib/jobResults/jobResults');
const Tasks = require('./lib/tasks/tasks');
const Pipelines = require('./lib/pipelines/pipelines');
const Execution = require('./lib/execution/execution');

const {
    registerSchema, watchSchema, initSchema, getSchema, setSchema
} = require('./lib/schema');

class EtcdClient extends EventEmitter {
    constructor() {
        super();
        this.instanceId = '';
        this.registerSchema = djsv(registerSchema);
        this.watchSchema = djsv(watchSchema);
        this.initSchema = djsv(initSchema);
        this.getSchema = djsv(getSchema);
        this.setSchema = djsv(setSchema);
        this.discovery = new Discovery();
        this.services = new Services();
        this.jobs = new Jobs();
        this.jobResults = new JobResults();
        this.tasks = new Tasks();
        this.pipelines = new Pipelines();
        this.execution = new Execution();
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
        const initSchemaConfig = this.initSchema(options);
        if (initSchemaConfig.valid) {
            this._etcdConfigPath = `${options.etcd.protocol}://${options.etcd.host}:${options.etcd.port}`;
            this.etcd3 = new Etcd3Client({ hosts: this._etcdConfigPath });
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
        }
        throw new Error(initSchemaConfig.error);
    }

    _tryParseJSON(json) {
        let parsed = json;
        try {
            parsed = JSON.parse(json);
        }
        catch (e) {
            console.error(e);
        }
        return parsed;
    }
}

module.exports = EtcdClient;
