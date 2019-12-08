const getSchema = {
    type: 'object',
    properties: {
        boardId: {
            type: 'string'
        }
    },
    required: [
        'boardId'
    ]
};

const setSchema = {
    type: 'object',
    properties: {
        boardId: {
            type: 'string'
        }
    },
    required: [
        'boardId',
    ]
};

const deleteSchema = {
    type: 'object',
    properties: {
        boardId: {
            type: 'string'
        }
    },
    required: [
        'boardId'
    ]
};

const watchSchema = {
    type: 'object',
    properties: {
        boardId: {
            type: 'string',
            default: ''
        }
    }
};

const listSchema = {
    type: 'object',
    properties: {
        boardId: {
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
