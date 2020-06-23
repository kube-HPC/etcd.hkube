const getSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string'
        },
        eventId: {
            type: 'string'
        }
    },
    required: [
        'name',
        'eventId'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        name: {
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
        'name',
        'eventId',
        'reason',
        'message'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        name: {
            type: 'string'
        },
        eventId: {
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
        eventId: {
            type: 'string'
        }
    }
};

const listSchema = {
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
    deleteSchema,
    watchSchema,
    listSchema
};
