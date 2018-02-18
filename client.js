const EtcdClient = require('./etcd-client');
const djsv = require('djsv');
const Discovery = require('./lib/discovery/discovery');
const Services = require('./lib/services/services');
const Jobs = require('./lib/jobs/jobs');
const JobResults = require('./lib/jobResults/jobResults');
const Tasks = require('./lib/tasks/tasks');
const Pipelines = require('./lib/pipelines/pipelines');
const Execution = require('./lib/execution/execution');
const { initSchema } = require('./lib/schema');

class Client {
    constructor() {
        this.instanceId = '';
        this._initSchema = djsv(initSchema);
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
     * @param {string} options.instanceId the specific guid the default data is a generated guid
     * @memberOf etcdDiscovery
     */
    init(options) {
        this._options = options;
        const initSchemaConfig = this._initSchema(options);
        if (initSchemaConfig.valid) {
            const etcdConfigPath = `${options.etcd.protocol}://${options.etcd.host}:${options.etcd.port}`;
            this._client = new EtcdClient({ hosts: etcdConfigPath });
            const data = {
                serviceName: options.serviceName,
                instanceId: options.instanceId,
                client: this._client
            }
            this.discovery.init(data);
            this.services.init(data);
            this.jobs.init(data);
            this.jobResults.init(data);
            this.tasks.init(data);
            this.pipelines.init(data);
            this.execution.init(data);
            return this;
        }
        throw new Error(initSchemaConfig.error);
    }
}

module.exports = Client;
