const TEMPLATES = {
    ALGORITHMS: {
        BUILDS: '/algorithms/builds/{buildId}',
        DEBUG: '/algorithms/debug/{name}',
        EXECUTIONS: '/algorithms/executions/{jobId}/{taskId}',
        QUEUE: '/algorithms/queue/{name}',
        REQUIREMENTS: '/algorithms/requirements/{name}',
        STORE: '/algorithms/store/{name}',
        VERSIONS: '/algorithms/versions/{name}/{algorithmImage}'
    },
    DISCOVERY: '/discovery/{serviceName}/{instanceId}',
    DRIVERS: '/drivers/{driverId}',
    EVENTS: '/events/{eventId}',
    EXECUTIONS: {
        STORED: '/executions/stored/{jobId}',
        RUNNING: '/executions/running/{jobId}',
    },
    JOBS: {
        RESULTS: '/jobs/results/{jobId}',
        STATUS: '/jobs/status/{jobId}',
        TASKS: '/jobs/tasks/{jobId}/{taskId}'
    },
    PIPELINE_DRIVERS: {
        QUEUE: '/pipelineDrivers/queue/{name}',
        STORE: '/pipelineDrivers/store/{name}',
        REQUIREMENTS: '/pipelineDrivers/requirements/{name}'
    },
    PIPELINES: '/pipelines/store/{name}',
    WEBHOOKS: '/webhooks/{jobId}/{type}',
    WORKERS: '/workers/{workerId}',
    EXPERIMENT: '/experiment/{name}',
    TENSORBOARDS: '/boards/tensorboards/{id}',
    TRIGGERS: {
        TREE: '/triggers/tree/{jobId}'
    }
};

module.exports = { TEMPLATES };
