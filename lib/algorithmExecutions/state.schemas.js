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

module.exports = {
    stateSchema
};
