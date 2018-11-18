const getSchema = {
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

const setSchema = {
    type: 'object',
    properties: {
        data: {
            default: {}
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

const deleteSchema = {
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

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema
};
