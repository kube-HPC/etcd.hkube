const getSchema = {
    type: 'object',
    properties: {
        driverId: {
            type: 'string'
        }
    },
    required: [
        'driverId'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        driverId: {
            type: 'string'
        }
    },
    required: [
        'driverId',
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        driverId: {
            type: 'string'
        }
    },
    required: [
        'driverId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        driverId: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        driverId: {
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
