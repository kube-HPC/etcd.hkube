const getSchema = {
    type: 'object',
    properties: {
        algorithmName: {
            type: 'string'
        },
        eventId: {
            type: 'string'
        }
    },
    required: [
        'algorithmName',
        'eventId'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        algorithmName: {
            type: 'string'
        },
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
        'algorithmName',
        'eventId',
        'reason',
        'message'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        algorithmName: {
            type: 'string'
        },
        eventId: {
            type: 'string'
        }
    },
    required: [
        'algorithmName'
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
    properties: {
        algorithmName: {
            type: 'string'
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
