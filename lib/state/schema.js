const getSchema = {
    type: 'object',
    properties: {
        suffix: {
            default: 'state',
            type: 'string'
        },
        jobId: {
            type: 'string'
        }
    }
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
        suffix: {
            default: 'state',
            type: 'string'
        }
    },
    required: [
        'jobId',

    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        suffix: {
            default: 'state',
            type: 'string'
        },
        jobId: {
            type: 'string'
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
            default: '',
        },
        prefix: {
            default: 'state',
            type: 'string'
        },
        suffix: {
            default: 'state',
            type: 'string'
        }
    }
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema
};
