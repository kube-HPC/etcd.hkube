const getSchema = {
    type: 'object',
    properties: {
        pipelineName: {
            type: 'string'
        },
        eventId: {
            type: 'string'
        }
    },
    required: [
        'pipelineName',
        'eventId'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        pipelineName: {
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
        'pipelineName',
        'eventId',
        'reason',
        'message'
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        pipelineName: {
            type: 'string'
        },
        eventId: {
            type: 'string'
        }
    },
    required: [
        'pipelineName'
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
        pipelineName: {
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
