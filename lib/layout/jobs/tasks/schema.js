const getSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        taskId: {
            type: 'string',
            default: ''
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
        }
    },
    required: [
        'jobId',
        'taskId'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        taskId: {
            type: 'string',
            default: ''
        }
    },
    required: [
        'jobId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string',
            default: ''
        },
        taskId: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string',
            default: ''
        }
    }
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema,
    listSchema
};
