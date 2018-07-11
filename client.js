const EtcdClient = require('./etcd-client');
const djsv = require('djsv');
const Discovery = require('./lib/discovery/discovery');
const Services = require('./lib/services/services');
// const Jobs = require('./lib/jobs/jobs');
const JobResults = require('./lib/jobResults/jobResults');
const JobStatus = require('./lib/jobStatus/jobStatus');
const Webhooks = require('./lib/webhooks/webhooks');
const Tasks = require('./lib/tasks/tasks');
const State = require('./lib/state/state');
const Pipelines = require('./lib/pipelines/pipelines');
const Execution = require('./lib/execution/execution');
const Workers = require('./lib/workers/workers');
const PipelineDriverQueue = require('./lib/pipeline-driver/queue');
const PipelineDriverRequirements = require('./lib/pipeline-driver/requirements');
const { AlgorithmQueue, ResourceRequirements, TemplatesStore } = require('./lib/algorithms/index');
const { initSchema } = require('./lib/schema');
 

class Client {
    constructor() {
        this.instanceId = '';
        this._initSchema = djsv(initSchema);
        this.discovery = new Discovery();
        this.services = new Services();
        //     this.jobs = new Jobs();
        this.jobResults = new JobResults();
        this.jobStatus = new JobStatus();
        this.webhooks = new Webhooks();
        this.tasks = new Tasks();
        this.jobState = new State();
        this.pipelines = new Pipelines();
        this.execution = new Execution();
        this.workers = new Workers();
        this.algorithms = {};
        this.algorithms.algorithmQueue = new AlgorithmQueue();
        this.algorithms.resourceRequirements = new ResourceRequirements();
        this.algorithms.templatesStore = new TemplatesStore();
        this.pipelineDrivers = {};
        this.pipelineDrivers.queue = new PipelineDriverQueue();
        this.pipelineDrivers.resourceRequirements = new PipelineDriverRequirements();
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
            };
            this.discovery.init(data);
            this.services.init(data);
            // this.jobs.init(data);
            this.jobResults.init(data);
            this.jobStatus.init(data);
            this.webhooks.init(data);
            this.tasks.init(data);
            this.jobState.init(data);
            this.workers.init(data);
            this.pipelines.init(data);
            this.execution.init(data);
            this.algorithms.algorithmQueue.init(data);
            this.algorithms.resourceRequirements.init(data);
            this.algorithms.templatesStore.init(data);
            this.pipelineDrivers.queue.init(data);
            this.pipelineDrivers.resourceRequirements.init(data);
            return this;
        }
        throw new Error(initSchemaConfig.error);
    }
}

module.exports = Client;
