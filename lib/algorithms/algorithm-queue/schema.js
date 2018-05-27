const getSchema = {
    type: 'object',
    properties: {
        queueName: {
            type: 'string',
            default: ''
        }
    }
};
const setSchema = {
    type: 'object',
    properties: {
        data: {
            default: null
        }
    }
};

const deleteSchema = {
    type: 'object',
    properties: {
        queueName: {
            type: 'string'
        }
    },
    required: [
        'queueName'
    ]
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema
};
