const getSchema = {
    type: 'object',
    properties: {
        queueId: {
            type: 'string'
        }
    },
    required: [
        'queueId'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        queueId: {
            type: 'string'
        }
    },
    required: [
        'queueId',
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        queueId: {
            type: 'string'
        }
    },
    required: [
        'queueId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        queueId: {
            type: 'string'
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        queueId: {
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
