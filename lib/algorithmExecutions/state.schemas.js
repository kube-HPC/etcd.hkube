const stateSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        taskId: {
            type: 'string'
        }
    },
    required: [
        'jobId',
        'taskId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        taskId: {
            type: 'string'
        }
    }
};

module.exports = {
    stateSchema
};
