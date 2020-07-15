const getSchema = {
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

const setSchema = {
    type: 'object',
    properties: {
        eventId: {
            type: 'string'
        },
        reason: {
            type: 'string'
        },
        message: {
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
            type: 'string'
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {}
};

module.exports = {
    getSchema,
    setSchema,
    deleteSchema,
    watchSchema,
    listSchema
};
