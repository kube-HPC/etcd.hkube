const EtcdClient = require('./etcd-client');
const Discovery = require('./discovery/discovery');
const JobResults = require('./jobResults/jobResults');
const JobStatus = require('./jobStatus/jobStatus');
const Webhooks = require('./webhooks/webhooks');
const Tasks = require('./tasks/tasks');
const State = require('./jobsState/state');
const Pipelines = require('./pipelines/pipelines');
const Execution = require('./execution/execution');
const RunningPipelines = require('./execution/running-pipelines');
const Workers = require('./workers/workers');
const { AlgorithmQueue, ResourceRequirements, TemplatesStore, AlgorithmDebug } = require('./algorithms');
const { PipelineDriverQueue, PipelineDriverRequirements, PipelineDriverTemplatesStore } = require('./pipeline-drivers');

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
