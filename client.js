const djsv = require('djsv');
const EtcdClient = require('./etcd-client');
const Discovery = require('./lib/discovery/discovery');
const Services = require('./lib/services/services');
const JobResults = require('./lib/jobResults/jobResults');
const JobStatus = require('./lib/jobStatus/jobStatus');
const Webhooks = require('./lib/webhooks/webhooks');
const Tasks = require('./lib/tasks/tasks');
const State = require('./lib/state/state');
const Pipelines = require('./lib/pipelines/pipelines');
const Execution = require('./lib/execution/execution');
const RunningPipelines = require('./lib/execution/running-pipelines');
const AlgorithmExecutions = require('./lib/algorithmExecutions/algorithmExecutions');
const Workers = require('./lib/workers/workers');
const Drivers = require('./lib/drivers/drivers');
const { PipelineDriverQueue, PipelineDriverRequirements, PipelineDriverTemplatesStore } = require('./lib/pipeline-driver');
const AlgorithmDebug = require('./lib/debug/debug');
const { AlgorithmQueue, ResourceRequirements, TemplatesStore } = require('./lib/algorithms/index');
const { initSchema } = require('./lib/schema');

class Client {
    constructor() {
        this.instanceId = '';
        this._initSchema = djsv(initSchema);
        this.discovery = new Discovery();
        this.services = new Services();
        this.jobResults = new JobResults();
        this.jobStatus = new JobStatus();
        this.webhooks = new Webhooks();
        this.tasks = new Tasks();
        this.jobState = new State();
        this.pipelines = new Pipelines();
        this.execution = new Execution();
        this.runningPipelines = new RunningPipelines();
        this.algorithmExecutions = new AlgorithmExecutions();
        this.workers = new Workers();
        this.drivers = new Drivers();
        this.algorithms = {};
        this.algorithms.algorithmQueue = new AlgorithmQueue();
        this.algorithms.resourceRequirements = new ResourceRequirements();
        this.algorithms.templatesStore = new TemplatesStore();
        this.pipelineDrivers = {};
        this.pipelineDrivers.queue = new PipelineDriverQueue();
        this.pipelineDrivers.resourceRequirements = new PipelineDriverRequirements();
        this.pipelineDrivers.templatesStore = new PipelineDriverTemplatesStore();
        this.algorithmDebug = new AlgorithmDebug();
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
            this.jobResults.init(data);
            this.jobStatus.init(data);
            this.webhooks.init(data);
            this.tasks.init(data);
            this.jobState.init(data);
            this.workers.init(data);
            this.drivers.init(data);
            this.pipelines.init(data);
            this.execution.init(data);
            this.runningPipelines.init(data);
            this.algorithmExecutions.init(data);
            this.algorithms.algorithmQueue.init(data);
            this.algorithms.resourceRequirements.init(data);
            this.algorithms.templatesStore.init(data);
            this.pipelineDrivers.queue.init(data);
            this.pipelineDrivers.resourceRequirements.init(data);
            this.pipelineDrivers.templatesStore.init(data);
            this.algorithmDebug.init(data);
            return this;
        }
        throw new Error(initSchemaConfig.error);
    }
}

module.exports = Client;
