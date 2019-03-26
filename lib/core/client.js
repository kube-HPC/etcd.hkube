const EtcdClient = require('./etcd-client');
const Discovery = require('../entities/discovery/discovery');
const JobResults = require('../entities/jobs/results/results');
const JobState = require('../entities/jobs/state/state');
const JobStatus = require('../entities/jobs/status/status');
const Tasks = require('../entities/jobs/tasks/tasks');
const Webhooks = require('../entities/webhooks/webhooks');
const Pipelines = require('../entities/pipelines/pipelines');
const ExecutionStored = require('../entities/execution/stored');
const ExecutionRunning = require('../entities/execution/running');
const Workers = require('../entities/workers/workers');
const { AlgorithmQueue, ResourceRequirements, TemplatesStore, AlgorithmDebug, AlgorithmBuilds } = require('../entities/algorithms');
const { PipelineDriverQueue, PipelineDriverRequirements, PipelineDriverTemplatesStore } = require('../entities/pipeline-drivers');

class Client {
    constructor(options) {
        this._client = new EtcdClient(options);
        const data = { client: this._client, ...options };

        this.algorithms = {
            queue: new AlgorithmQueue(data),
            requirements: new ResourceRequirements(data),
            store: new TemplatesStore(data),
            debug: new AlgorithmDebug(data),
            builds: new AlgorithmBuilds(data)
        };
        this.discovery = new Discovery(data);
        this.executions = {
            stored: new ExecutionStored(data),
            running: new ExecutionRunning(data),
        };
        this.jobs = {
            tasks: new Tasks(data),
            state: new JobState(data),
            status: new JobStatus(data),
            results: new JobResults(data)
        };
        this.pipelineDrivers = {
            queue: new PipelineDriverQueue(data),
            requirements: new PipelineDriverRequirements(data),
            store: new PipelineDriverTemplatesStore(data)
        };
        this.pipelines = new Pipelines(data);
        this.webhooks = new Webhooks(data);
        this.workers = new Workers(data);
    }
}

module.exports = Client;
