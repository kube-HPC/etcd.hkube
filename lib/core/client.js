const EtcdClient = require('./etcd-client');
const Discovery = require('../entities/discovery/discovery');
const JobResults = require('../entities/jobResults/jobResults');
const JobStatus = require('../entities/jobStatus/jobStatus');
const Webhooks = require('../entities/webhooks/webhooks');
const Tasks = require('../entities/tasks/tasks');
const State = require('../entities/jobsState/state');
const Pipelines = require('../entities/pipelines/pipelines');
const Execution = require('../entities/execution/execution');
const RunningPipelines = require('../entities/execution/running-pipelines');
const Workers = require('../entities/workers/workers');
const { AlgorithmQueue, ResourceRequirements, TemplatesStore, AlgorithmDebug } = require('../entities/algorithms');
const { PipelineDriverQueue, PipelineDriverRequirements, PipelineDriverTemplatesStore } = require('../entities/pipeline-drivers');

class Client {
    constructor(options) {
        this._client = new EtcdClient(options);
        const data = { client: this._client, ...options };
        this.discovery = new Discovery(data);
        this.jobResults = new JobResults(data);
        this.jobStatus = new JobStatus(data);
        this.webhooks = new Webhooks(data);
        this.tasks = new Tasks(data);
        this.jobState = new State(data);
        this.pipelines = new Pipelines(data);
        this.execution = new Execution(data);
        this.runningPipelines = new RunningPipelines(data);
        this.workers = new Workers(data);
        this.algorithms = {
            queue: new AlgorithmQueue(data),
            requirements: new ResourceRequirements(data),
            store: new TemplatesStore(data),
            debug: new AlgorithmDebug(data)
        };
        this.pipelineDrivers = {
            queue: new PipelineDriverQueue(data),
            requirements: new PipelineDriverRequirements(data),
            store: new PipelineDriverTemplatesStore(data)
        };
    }
}

module.exports = Client;
