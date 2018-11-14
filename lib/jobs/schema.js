const getSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        suffix: {
            type: 'string',
            default: 'state'
        },
        data: {
            default: null
        }
    }
};

const setSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        suffix: {
            type: 'string',
            default: 'state'
        },
        data: {
            default: null
        }
    },
    required: [
        'jobId'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        suffix: {
            type: 'string',
            default: 'state'
        },
    },
    required: [
        'jobId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        jobId: {
            type: 'string'
        },
        suffix: {
            type: 'string',
            default: 'state'
        }
    }
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema
};
