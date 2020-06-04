const Service = require('../../core/service');
const template = require('../../core/templates').TEMPLATES.TRIGGERS.TREE;
const schemas = require('./schema');

class TriggersTree extends Service {
    constructor(options) {
        super({ ...schemas, ...options, template });
    }

    async set(options) {
        const { name, jobId, rootJobId, parentJobId } = options;
        let tree = await super.get({ jobId: rootJobId || jobId });
        if (!tree) {
            tree = this.createNode(name, jobId);
        }
        else {
            const node = this.traverse(tree, parentJobId);
            node.children.push(this.createNode(name, jobId));
        }
        await super.set(tree);
    }

    traverse(current, parent) {
        if (current.jobId === parent) {
            return current;
        }
        if (current.children.length > 0) {
            let i = 0;
            let node = null;
            while (i < current.children.length && !node) {
                node = this.traverse(current.children[i], parent);
                i += 1;
            }
            return node;
        }
        return null;
    }

    createNode(name, jobId) {
        return {
            name,
            jobId,
            children: []
        };
    }
}

module.exports = TriggersTree;
