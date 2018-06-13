const getSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            default: ''
        }
    }
};
const setSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string'
        },
        data: {
            default: null
        }
    },
    required: [
        'name'
    ]
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

module.exports = {
    getSchema,
    setSchema,
    deleteSchema
};
