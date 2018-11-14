const djsv = require('djsv');
const EtcdClient = require('./etcd-client');
const Discovery = require('./discovery/discovery');
const JobResults = require('./jobResults/jobResults');
const JobStatus = require('./jobStatus/jobStatus');
const Webhooks = require('./webhooks/webhooks');
const Tasks = require('./tasks/tasks');
const State = require('./state/state');
const Pipelines = require('./pipelines/pipelines');
const Execution = require('./execution/execution');
const RunningPipelines = require('./execution/running-pipelines');
const Workers = require('./workers/workers');
const { AlgorithmQueue, ResourceRequirements, TemplatesStore, AlgorithmDebug } = require('./algorithms');
const { PipelineDriverQueue, PipelineDriverRequirements, PipelineDriverTemplatesStore } = require('./pipeline-driver');
const { initSchema } = require('./schema');

class Client {
    constructor(options) {
        this.instanceId = '';
        this._initSchema = djsv(initSchema);
        const initSchemaConfig = this._initSchema(options);
        if (!initSchemaConfig.valid) {
            throw new Error(initSchemaConfig.error);
        }
        const hosts = `${options.protocol}://${options.host}:${options.port}`;
        this._client = new EtcdClient({ hosts });
        const data = {
            serviceName: options.serviceName,
            instanceId: options.instanceId,
            client: this._client
        };

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
            algorithmQueue: new AlgorithmQueue(data),
            resourceRequirements: new ResourceRequirements(data),
            templatesStore: new TemplatesStore(data),
            debug: new AlgorithmDebug(data)
        };
        this.pipelineDrivers = {
            queue: new PipelineDriverQueue(data),
            resourceRequirements: new PipelineDriverRequirements(data),
            templatesStore: new PipelineDriverTemplatesStore(data)
        };
    }
}

module.exports = Client;