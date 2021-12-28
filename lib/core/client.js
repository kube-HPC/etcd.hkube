const EtcdClient = require('./etcd-client');
const Discovery = require('../layout/discovery/discovery');
const Drivers = require('../layout/drivers/drivers');
const JobResults = require('../layout/jobs/results/results');
const JobsActive = require('../layout/jobs/active/active');
const JobStatus = require('../layout/jobs/status/status');
const Tasks = require('../layout/jobs/tasks/tasks');
const Webhooks = require('../layout/webhooks/webhooks');
const Pipelines = require('../layout/pipelines/pipelines');
const ExecutionStored = require('../layout/execution/stored');
const ExecutionRunning = require('../layout/execution/running');
const Workers = require('../layout/workers/workers');
const Experiment = require('../layout/experiment/experiment');
const Events = require('../layout/events/events');
const Tensorboards = require('../layout/tensorboards/tensorboards');
const TriggersTree = require('../layout/triggers/tree');
const StreamingStatistics = require('../layout/streaming/statistics');
const { AlgorithmQueue, ResourceRequirements, TemplatesStore, AlgorithmDebug, AlgorithmBuilds, AlgorithmExecutions, AlgorithmVersions } = require('../layout/algorithms');
const { PipelineDriverQueue, PipelineDriverRequirements, PipelineDriverTemplatesStore } = require('../layout/pipeline-drivers');

class Client {
    constructor(options) {
        this._client = new EtcdClient(options);
        const data = { client: this._client, ...options };

        this.algorithms = {
            builds: new AlgorithmBuilds(data),
            debug: new AlgorithmDebug(data),
            executions: new AlgorithmExecutions(data),
            queue: new AlgorithmQueue(data),
            requirements: new ResourceRequirements(data),
            store: new TemplatesStore(data),
            versions: new AlgorithmVersions(data)
        };
        this.discovery = new Discovery(data);
        this.drivers = new Drivers(data);
        this.events = new Events(data);
        this.executions = {
            stored: new ExecutionStored(data),
            running: new ExecutionRunning(data)
        };
        this.jobs = {
            active: new JobsActive(data),
            tasks: new Tasks(data),
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
        this.experiments = new Experiment(data);
        this.tensorboard = new Tensorboards(data);
        this.triggers = {
            tree: new TriggersTree(data)
        };
        this.streaming = {
            statistics: new StreamingStatistics(data)
        };
    }
}

module.exports = Client;
