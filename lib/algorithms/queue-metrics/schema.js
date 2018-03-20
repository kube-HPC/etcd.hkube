const getSchema = {
    type: 'object',
    properties: {
        alg: {
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

const watchSchema = {
    type: 'object',
    properties: {
        alg: {
            type: 'string',
            default: ''
        }
    }
};

module.exports = {
    getSchema,
    setSchema,
    watchSchema
};
