const getTasksSchema = {
    type: 'object',
    properties: {
        suffix: {
            default: '',
            type: 'string'
        },
        jobId: {
            type: 'string'
        },
        taskId: {
            default: '',
            type: 'string'
        }
    },
    required: [
        'jobId'
    ]
};

const getSetTaskSchema = {
    type: 'object',
    properties: {
        data: {
            default: {},
            anyOf: [
                {
                    type: [
                        'string',
                        'object',
                        'null'
                    ]
                }
            ]
        },
        jobId: {
            type: 'string'
        },
        taskId: {
            type: 'string'
        },
        suffix: {
            default: '',
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
        index: {
            default: null,
            anyOf: [
                {
                    type: [
                        'integer',
                        'null'
                    ]
                }
            ]
        },
        jobId: {
            type: 'string',
            default: '',
        },
        taskId: {
            type: 'string',
            default: '',
        },
        prefix: {
            default: '',
            type: 'string'
        },
        suffix: {
            default: '',
            type: 'string'
        }
    }
};

module.exports = {
    getTasksSchema,
    getSetTaskSchema,
    watchSchema
};
