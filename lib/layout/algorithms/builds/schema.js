const getSchema = {
    type: 'object',
    properties: {
        buildId: {
            type: 'string'
        }
    },
    required: [
        'buildId'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        buildId: {
            type: 'string'
        },
        data: {
            default: null
        }
    },
    required: [
        'buildId'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        buildId: {
            type: 'string'
        }
    },
    required: [
        'buildId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        buildId: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        buildId: {
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
