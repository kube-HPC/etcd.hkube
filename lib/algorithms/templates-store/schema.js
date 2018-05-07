const getSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            default: ''
        }
    }
};

const deleteSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string'
        }
    },
    required: [
        'name'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        data: {
            default: null
        }
    }
};

const watchSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            default: ''
        }
    }
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema
};
