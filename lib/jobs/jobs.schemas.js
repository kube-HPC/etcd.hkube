const getTasksSchema = {
    "type": "object",
    "properties": {

        "etcdOptions": {
            "type": "object",
            "default": { recursive: true }
        },
        "index": {
            "default": null,
            "type": ["integer", "null"]
        },
        "suffix": {
            "default": '',
            "type": "string"
        },
        "jobId": {
            "type": "string"
        },

    }

}

const getSetTaskSchema = {
    "type": "object",
    "properties": {

        "data": {
            "default": {},
            "type": "object"
        },
        "jobId": {
            "type": "string"
        },
        "taskId": {
            "type": "string"
        },
        "suffix": {
            "default": '',
            "type": "string"
        }

    }
}

module.exports = {
    getTasksSchema,
    getSetTaskSchema
};