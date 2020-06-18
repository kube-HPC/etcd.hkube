const getSchema = {
    type: 'object',
    properties: {
        eventId: {
            type: 'string'
        }
    }
};

const setSchema = {
    type: 'object',
    properties: {
        eventId: {
            type: 'string'
        }
    },
    required: [
        'eventId',
        'reason',
        'message'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        eventId: {
            type: 'string'
        }
    },
    required: [
        'eventId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        eventId: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        eventId: {
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
