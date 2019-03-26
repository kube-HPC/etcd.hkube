const TEMPLATES = {
    DISCOVERY: '/discovery/{serviceName}/{instanceId}',
    JOBS: {
        RESULTS: '/jobs/results/{jobId}',
        STATE: '/jobs/state/{jobId}',
        STATUS: '/jobs/status/{jobId}',
        TASKS: '/jobs/tasks/{jobId}/{taskId}'
    },
    WORKERS: '/workers/{workerId}',
    WEBHOOKS: '/webhooks/{jobId}/{type}',
    PIPELINES: '/pipelines/store/{name}',
    EXECUTIONS: {
        STORED: '/executions/stored/{jobId}',
        RUNNING: '/executions/running/{jobId}',
    },
    ALGORITHMS: {
        BUILDS: '/algorithms/builds/{buildId}',
        DEBUG: '/algorithms/debug/{algorithmName}',
        EXECUTIONS: '/algorithms/executions/{jobId}/{taskId}',
        QUEUE: '/algorithms/queue/{name}',
        REQUIREMENTS: '/algorithms/requirements/{name}',
        STORE: '/algorithms/store/{name}'
    },
    PIPELINE_DRIVERS: {
        QUEUE: '/pipelineDrivers/queue/{name}',
        STORE: '/pipelineDrivers/store/{name}',
        REQUIREMENTS: '/pipelineDrivers/requirements/{name}'
    }
};

module.exports = { TEMPLATES };
