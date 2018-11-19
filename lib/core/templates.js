module.exports.TEMPLATES = {
    DISCOVERY: '/discovery/{serviceName}/{instanceId}',
    TASKS: '/jobs/tasks/{jobId}/{taskId}',
    WORKERS: '/workers/{workerId}',
    JOB_RESULTS: '/jobs/results/{jobId}',
    JOB_STATUS: '/jobs/status/{jobId}',
    JOB_STATE: '/jobs/state/{jobId}',
    WEBHOOKS: '/webhooks/{jobId}/{type}',
    PIPELINES: '/pipelines/store/{name}',
    EXECUTIONS: '/executions/{jobId}',
    RUNNING_PIPELINES: '/runningPipelines/{jobId}',
    ALGORITHMS_DEBUG: '/algorithms/debug/{algorithmName}',
    ALGORITHMS_QUEUE: '/algorithms/queue/{name}',
    ALGORITHMS_STORE: '/algorithms/store/{name}',
    ALGORITHMS_REQUIREMENTS: '/algorithms/requirements/{name}',
    PIPELINE_DRIVERS_QUEUE: '/pipelineDrivers/queue/{name}',
    PIPELINE_DRIVERS_STORE: '/pipelineDrivers/store/{name}',
    PIPELINE_DRIVERS_REQUIREMENTS: '/pipelineDrivers/requirements/{name}'
};
