const getSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
        },
        version: {
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
        name: {
            type: 'string'
        },
        version: {
            type: 'string'
        }
    },
    required: [
        'name',
        'version'
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

const watchSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string'
        },
        version: {
            type: 'string',
            default: ''
        }
    },
    required: [
        'name'
    ]
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema,
    listSchema
};
