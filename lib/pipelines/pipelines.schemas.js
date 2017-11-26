const pipelineSchema = {
    "type": "object",
    "properties": {
        "etcdOptions": {
            "type": "object",
            "default": { recursive: true }
        },
        "name": {
            "default": '',
            "type": "string"
        }
    }
}

const deleteSchema = {
    "type": "object",
    "properties": {
        "etcdOptions": {
            "type": "object",
            "default": { recursive: true }
        },
        "name": {
            "required": true,
            "type": "string"
        }
    }
}

const watchSchema = {
    "type": "object",
    "properties": {
        "etcdOptions": {
            "default": { wait: true, recursive: true },
            "type": "object"
        },
        "index": {
            "default": null,
            "type": ["integer", "null"]
        },
        "name": {
            "default": '',
            "type": "string"
        }
    }
}

module.exports = {
    pipelineSchema,
    watchSchema,
    deleteSchema
};
