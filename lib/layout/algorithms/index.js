const AlgorithmQueue = require('./queue/queue');
const ResourceRequirements = require('./requirements/requirements');
const TemplatesStore = require('./store/store');
const AlgorithmDebug = require('./debug/debug');
const AlgorithmBuilds = require('./builds/builds');
const AlgorithmExecutions = require('./executions/executions');
const AlgorithmVersions = require('./versions/versions');

module.exports = {
    AlgorithmQueue,
    ResourceRequirements,
    TemplatesStore,
    AlgorithmDebug,
    AlgorithmBuilds,
    AlgorithmExecutions,
    AlgorithmVersions
};
