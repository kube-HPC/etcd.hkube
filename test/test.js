
const { expect } = require('chai');
const Etcd = require('../index');
const Watcher = require('../lib/watch/watcher');
const Semaphore = require('await-done').semaphore;
const sinon = require('sinon');
const delay = require('await-delay');
const uuidv4 = require('uuid/v4');
let etcd = new Etcd();
const SERVICE_NAME = 'my-test-service';
let _semaphore = null;

describe('etcd', () => {
    beforeEach(async () => {
        etcd = new Etcd();
        await etcd.init({ etcd: { host: 'localhost', port: 4001 }, serviceName: SERVICE_NAME });
        _semaphore = new Semaphore();
    });
    describe('Discovery', () => {
        it('should register key and update ttl according to interval', async () => {
            const instanceId = `register-test-${uuidv4()}`;
            const pathToWatch = 'path/to/watch';
            const watcher = new Watcher(etcd._client);
            const putEvent = sinon.spy();
            const changeEvent = sinon.spy();
            const deleteEvent = sinon.spy();
            const expireEvent = sinon.spy();
            const watch = await watcher.watch(pathToWatch);
            expect(watch).to.have.property('watcher');
            expect(watch).to.have.property('data');
            watch.watcher.on('disconnected', () => console.log('disconnected...'));
            watch.watcher.on('connected', () => console.log('successfully reconnected!'));
            watch.watcher.on('put', (res) => {
                putEvent();
            });
            watch.watcher.on('delete', (res) => {
                deleteEvent();
            });
            watch.watcher.on('data', () => {
                changeEvent();
                _semaphore.callDone();
            });
            await etcd._client.put(pathToWatch, { data: 'bla' });
            await _semaphore.done({ doneAmount: 1 });
            watch.watcher.removeAllListeners();

            expect(changeEvent.callCount).to.be.equal(1);
            expect(putEvent.callCount).to.be.equal(1);
            expect(expireEvent.callCount).to.be.equal(0);
            expect(deleteEvent.callCount).to.be.equal(0);
        }).timeout(5000);
    });
    describe('Get/Set', () => {
        it('etcd set and get simple test', async () => {
            const instanceId = `etcd-set-get-test-${uuidv4()}`;
            const data = { data: { bla: 'bla' } };
            await etcd.services.client.set({ data, instanceId });
            const etcdGet = await etcd.services.client.get({ instanceId, prefix: 'services' });
            expect(etcdGet.data).to.have.deep.keys(data.data);
        });
        it('etcd sort with limit', async () => {
            const instanceId = `etcd-set-get-test-${uuidv4()}`;
            for (let i = 0; i < 10; i++) {
                await etcd._client.put(`${instanceId}/${i}`, { val: `val${i}` }, null);
                await delay(100);
            }
            await delay(200);
            const data = await etcd._client.getSortLimit(`${instanceId}`, ['Mod', 'Ascend'], 6);
            expect(JSON.parse(data[Object.keys(data)[0]]).val).to.equal('val0');
            expect(Object.keys(data).length).to.equal(6);
        });
    });
    describe('Services', () => {
        describe('get/set', () => {
            it('should get without specific instanceId', async () => {
                const data = { data: { bla: 'bla' } };
                await etcd.services.client.set(data);
                const etcdGet = await etcd.services.client.get({ prefix: 'services' });
                expect(etcdGet).to.have.deep.keys(data.data);
            });
            it('should get without specific instanceId with suffix', async () => {
                const suffix = 'test';
                const data = { data: { bla: 'bla' } };
                await etcd.services.client.set({ data, suffix });
                const etcdGet = await etcd.services.client.get({ prefix: 'services', suffix });
                expect(etcdGet.data).to.have.deep.keys(data.data);
            });
        });
        describe('pipeline-driver', () => {
            it('should set and get tasks', async () => {
                const { pipelineDriver } = etcd.services;
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await pipelineDriver.setTaskState({ jobId, taskId, data });
                const etcdGet = await pipelineDriver.getTaskState({ jobId, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should get list', async () => {
                const { pipelineDriver } = etcd.services;
                const taskId = `taskid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await pipelineDriver.setTaskState({ taskId, data });
                const etcdGet = await pipelineDriver.getDriverTasks({ taskId });
                expect(etcdGet[Object.keys(etcdGet)[0]]).to.have.deep.keys({ taskId, ...data });
            });
            it('should delete state', async () => {
                const { pipelineDriver } = etcd.services;
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await pipelineDriver.setState({ jobId, data });
                await pipelineDriver.deleteState({ jobId });
                const etcdGet = await pipelineDriver.getState({ jobId });
                expect(etcdGet).to.be.null;
            });
        });
        describe('algorithm-queue', () => {
            it('get', async () => {
                const { algorithmQueue } = etcd.services;
                const queueName = `algorithm-x-${uuidv4()}`;
                const queue = { bla: 'bla' };
                await algorithmQueue.store({ queueName, queue });
                const etcdGet = await algorithmQueue.get({ queueName });
                expect(etcdGet).to.have.deep.keys(queue);
            });
            it('store', async () => {
                const { algorithmQueue } = etcd.services;
                const queueName = `algorithm-x-${uuidv4()}`;
                const queue = { bla: 'bla' };
                await algorithmQueue.store({ queueName, queue });
                const etcdGet = await algorithmQueue.get({ queueName });
                expect(etcdGet).to.have.deep.keys(queue);
            });
        });
    });
    describe('Jobs', () => {
        describe('sets', () => {
            it('should set state', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const state = 'started';
                await etcd.jobs.setState({ state, jobId });
                const etcdGet = await etcd.jobs.getState({ jobId });
                expect(etcdGet.state).to.equal(state);
            });
        });
        describe('watch', () => {
            it('should watch state changed', async () => {
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.watch({ jobId });
                etcd.jobs.on('change', (res) => {
                    expect(res.state).to.equal(state);
                });
                etcd.jobs.setState({ state, jobId });
            });
            it('should watch stop state', async () => {
                const state = 'stop';
                const reason = 'jobs must be cancelled';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.watch({ jobId });
                etcd.jobs.on('change', (res) => {
                    expect(res.state).to.equal(state);
                    expect(res.reason).to.equal(reason);
                });
                etcd.jobs.stop({ reason, jobId });
            });
            it('should get watch object', async () => {
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.setState({ state, jobId });
                const object = await etcd.jobs.watch({ jobId });
                expect(object).to.deep.equal({ state });
            });
        });
        describe('unwatch', () => {
            it('should watch stateChanged', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.watch({ jobId });
                etcd.jobs.on('change', () => {
                    isCalled = true;
                });
                await etcd.jobs.unwatch({ jobId });
                etcd.jobs.setState({ state, jobId });
                await delay(1000);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('JobResults', () => {
        describe('sets', () => {
            it('should set and get results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobResults.setResults({ data, jobId });
                const etcdGet = await etcd.jobResults.getResults({ jobId });
                expect(etcdGet).to.have.deep.keys({ ...data, jobId });
            });
            it('should get results by status', async () => {
                const jobId1 = `jobid-${uuidv4()}`;
                const jobId2 = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                const status = 'completed';
                await etcd.jobResults.setResults({ data, jobId: jobId1 });
                await etcd.jobResults.setResults({ data, jobId: jobId2 });
                await etcd.jobResults.setStatus({ data: 'failed', jobId: jobId1 });
                await etcd.jobResults.setStatus({ data: 'completed', jobId: jobId2 });
                const etcdGet = await etcd.jobResults.getResultsByStatus({ status });
                expect(etcdGet[0].status).to.equal(status);
            });
            it('should set and get status log', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, status: 'sent' };
                await etcd.jobResults.setWebhooksStatus({ data, jobId });
                const etcdGet = await etcd.jobResults.getWebhooksStatus({ jobId });
                expect(etcdGet).to.deep.equal(data);
            });
            it('should set and get results log', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, status: 'sent' };
                await etcd.jobResults.setWebhooksResults({ data, jobId });
                const etcdGet = await etcd.jobResults.getWebhooksResults({ jobId });
                expect(etcdGet).to.deep.equal(data);
            });
            it('should set and get result status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                const status = 'special';
                await etcd.jobResults.setWebhooksResults({ data, jobId });
                await etcd.jobResults.setWebhooksResults({ data, jobId });
                await etcd.jobResults.setWebhooksStatus({ data, jobId });
                await etcd.jobResults.setWebhooksStatus({ data, jobId });
                await etcd.jobResults.setResults({ data, jobId });
                await etcd.jobResults.setResults({ data, jobId });
                await etcd.jobResults.setStatus({ data: status, jobId });
                await etcd.jobResults.setStatus({ data: status, jobId });
                const etcdGet = await etcd.jobResults.getResultsByStatus({ status });
                expect(etcdGet).to.be.an('array');
                expect(etcdGet[0]).to.have.property('jobId');
                expect(etcdGet[0]).to.have.property('result');
                expect(etcdGet[0]).to.have.property('status');
                expect(etcdGet[0]).to.have.property('webhooks');
                expect(etcdGet[0]).to.have.property('webhooks');
                expect(etcdGet[0].webhooks).to.have.property('result');
                expect(etcdGet[0].webhooks).to.have.property('status');
            });
        });
        describe('watch', () => {
            it('should watch results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, bla: 'bla' };
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('result-change', (res) => {
                    expect(res).to.deep.equal(data);
                    _semaphore.callDone();
                });
                etcd.jobResults.setResults({ data, jobId });
                await _semaphore.done();
            });
            it('should watch status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, status: 'completed' };
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('status-change', (res) => {
                    expect(res).to.deep.equal(data);
                    _semaphore.callDone();
                });
                etcd.jobResults.setStatus({ data, jobId });
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch stateChanged', async () => {
                let isCalled = false;
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('status-change', () => {
                    isCalled = true;
                });
                await etcd.jobResults.unwatch({ jobId });
                etcd.jobResults.setStatus({ state, jobId });
                await delay(1000);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('Tasks', () => {
        describe('sets', () => {
            const jobID = `jobid-${uuidv4()}`;
            it('should set results', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.setState({
                    jobId: jobID, taskId, status: data.status, result: data.result
                });
                const etcdGet = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should set status', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { status: 'failed', error: 'stam error' };
                await etcd.tasks.setState({
                    jobId: jobID, taskId, status: data.status, error: data.error
                });
                const etcdGet = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should get jobs tasks', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { status: 'failed', error: 'stam error' };
                await etcd.tasks.setState({
                    jobId: jobID, taskId, status: data.status, error: data.error
                });
                await etcd.tasks.setState({
                    jobId: jobID, taskId, status: data.status, error: data.error
                });
                const list = await etcd.tasks.list({ jobId: jobID });
                const task = list.values().next();
                expect(task.value).to.have.property('status');
            });
        });
        describe('watch', () => {
            it('should watch key', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.watch({ jobId, taskId });
                etcd.tasks.on('change', async (res) => {
                    expect({ jobId, ...data, taskId }).to.have.deep.keys(res);
                    await etcd.tasks.unwatch({ jobId, taskId });
                    _semaphore.callDone();
                });
                etcd.tasks.setState({
                    jobId, taskId, status: data.status, result: data.result
                });
                await _semaphore.done();
            });
            it('should watch all keys', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.watch({ jobId });
                etcd.tasks.on('change', async (res) => {
                    const obj = { ...data, jobId, taskId };
                    expect(obj).to.have.deep.keys(res);
                    _semaphore.callDone();
                });
                etcd.tasks.setState({
                    jobId, taskId, status: data.status, result: data.result
                });
                await _semaphore.done();
            });
            it('should return the set obj on watch', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.setState({
                    jobId, taskId, status: data.status, result: data.result
                });
                const watch = await etcd.tasks.watch({ jobId, taskId });
                expect(data).to.have.deep.keys(watch);
            });
            it('should throw error if watch already exists', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                await etcd.tasks.watch({ jobId, taskId });
                try {
                    await etcd.tasks.watch({ jobId, taskId });
                }
                catch (error) {
                    expect(error.message).to.equals(`already watching on /jobs/${jobId}/tasks/${taskId}`);
                }
            });
        });
        describe('unwatch', () => {
            it('should unwatch key', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                await etcd.tasks.watch({ jobId, taskId });
                etcd.tasks.on('change', (res) => {
                    expect(data).to.have.deep.keys(res);
                });
                await etcd.tasks.unwatch({ jobId, taskId });
                etcd.tasks.setState({
                    jobId, taskId, status: data.status, result: data.result
                });
            });
        });
    });
    describe('Execution', () => {
        describe('sets', () => {
            it('should set results', async () => {
                const jobID = `jobid-${uuidv4()}`;
                const pipeline = {
                    name: 'algo6',
                    nodes: [
                        {
                            nodeName: 'string',
                            algorithmName: 'string',
                            input: [
                                'string'
                            ]
                        }
                    ],
                    flowInput: {},
                    webhook: {
                        progressHook: 'string',
                        resultHook: 'string'
                    }
                };
                await etcd.execution.setExecution({ jobId: jobID, data: pipeline });
                const etcdGet = await etcd.execution.getExecution({ jobId: jobID });
                expect(pipeline).to.have.deep.keys(etcdGet);
            });
        });
    });
    describe('Pipelines', () => {
        describe('sets', () => {
            it('should set results', async () => {
                const name = 'pipeline-1';
                const data = { bla: 'bla' };
                await etcd.pipelines.setPipeline({ name, data });
                const etcdGet = await etcd.pipelines.getPipeline({ name });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should get all pipelines', async () => {
                const pipelines = await etcd.pipelines.getPipelines();
                expect(pipelines).to.be.an('array');
            });
        });
        describe('delete', () => {
            it('should delete pipeline', async () => {
                const name = 'pipeline-delete';
                const data = { bla: 'bla' };
                await etcd.pipelines.setPipeline({ name, data });
                await etcd.pipelines.deletePipeline({ name });
                const etcdGet = await etcd.pipelines.getPipeline({ name });
                expect(etcdGet).to.be.null;
            });
        });
        describe('watch', () => {
            it('should watch specific pipeline', async () => {
                const name = 'pipeline-2';
                const data = { bla: 'bla' };
                await etcd.pipelines.watch({ name });
                etcd.pipelines.on('change', (res) => {
                    expect({ name, data }).to.have.deep.keys(res);
                    _semaphore.callDone();
                });
                await etcd.pipelines.setPipeline({ name, data });
                await _semaphore.done();
            });
            it('should watch all pipelines', async () => {
                const name = 'pipeline-3';
                const data = { bla: 'bla' };
                await etcd.pipelines.watch();
                etcd.pipelines.on('change', (res) => {
                    expect({ name, data }).to.have.deep.keys(res);
                    _semaphore.callDone();
                });
                await etcd.pipelines.setPipeline({ name, data });
                await _semaphore.done();
            });
        });
    });
    describe('QueueMetrics', () => {
        describe('get/set', () => {
            it('should get/set specific queueMetrics', async () => {
                const options = { alg: 'green-alg', data: 'bla' };
                await etcd.algorithms.queueMetrics.setState(options);
                const etcdGet = await etcd.algorithms.queueMetrics.getState(options);
                expect(etcdGet).to.equal(options.data);
            });
            it('should get all queueMetrics', async () => {
                const pipelines = await etcd.algorithms.queueMetrics.list();
                expect(pipelines).to.be.an('array');
            });
        });
        describe('watch', () => {
            it('should watch specific queueMetrics', async () => {
                const options = { alg: 'green-alg', data: 'bla' };
                await etcd.algorithms.queueMetrics.watch(options);
                etcd.algorithms.queueMetrics.on('change', (res) => {
                    expect(res).to.deep.equal(options);
                    _semaphore.callDone();
                });
                await etcd.algorithms.queueMetrics.setState(options);
                await _semaphore.done();
            });
            it('should get data when call to watch', async () => {
                const options = { alg: 'blue-alg', data: 'bla' };
                await etcd.algorithms.queueMetrics.setState(options);
                const etcdGet = await etcd.algorithms.queueMetrics.watch(options);
                expect(etcdGet).to.have.deep.keys(options);
            });
            it('should watch all queueMetrics', async () => {
                const options1 = {};
                const options2 = { alg: 'yellow-alg', data: 'bla' };
                await etcd.algorithms.queueMetrics.watch();
                etcd.algorithms.queueMetrics.on('change', (res) => {
                    if (res.alg === options2.alg) {
                        expect(res).to.deep.equal(options2);
                        _semaphore.callDone();
                    }
                });
                await etcd.algorithms.queueMetrics.setState(options2);
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch specific queueMetrics', async () => {
                let isCalled = false;
                const options = { alg: 'black-alg', data: 'bla' };
                await etcd.algorithms.queueMetrics.watch(options);
                etcd.algorithms.queueMetrics.on('change', (res) => {
                    isCalled = true;
                });
                await etcd.algorithms.queueMetrics.unwatch(options);
                await etcd.algorithms.queueMetrics.setState(options);
                await delay(1000);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('ResourceRequirements', () => {
        describe('get/set', () => {
            it('should get/set specific resourceRequirements', async () => {
                const options = { alg: 'green-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.setState(options);
                const etcdGet = await etcd.algorithms.resourceRequirements.getState(options);
                expect(etcdGet).to.equal(options.data);
            });
            it('should get all resourceRequirements', async () => {
                const pipelines = await etcd.algorithms.resourceRequirements.list();
                expect(pipelines).to.be.an('array');
            });
        });
        describe('watch', () => {
            it('should watch specific resourceRequirements', async () => {
                const options = { alg: 'green-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.watch(options);
                etcd.algorithms.resourceRequirements.on('change', (res) => {
                    expect(res).to.deep.equal(options);
                    _semaphore.callDone();
                });
                await etcd.algorithms.resourceRequirements.setState(options);
                await _semaphore.done();
            });
            it('should get data when call to watch', async () => {
                const options = { alg: 'blue-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.setState(options);
                const etcdGet = await etcd.algorithms.resourceRequirements.watch(options);
                expect(etcdGet).to.have.deep.keys(options);
            });
            it('should watch all resourceRequirements', async () => {
                const options1 = {};
                const options2 = { alg: 'yellow-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.watch();
                etcd.algorithms.resourceRequirements.on('change', (res) => {
                    if (res.alg === options2.alg) {
                        expect(res).to.deep.equal(options2);
                        _semaphore.callDone();
                    }
                });
                await etcd.algorithms.resourceRequirements.setState(options2);
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch specific resourceRequirements', async () => {
                let isCalled = false;
                const options = { alg: 'black-alg', data: 'bla' };
                await etcd.algorithms.resourceRequirements.watch(options);
                etcd.algorithms.resourceRequirements.on('change', (res) => {
                    isCalled = true;
                });
                await etcd.algorithms.resourceRequirements.unwatch(options);
                await etcd.algorithms.resourceRequirements.setState(options);
                await delay(1000);
                expect(isCalled).to.equal(false);
            });
        });
    });
    describe('TemplatesStore', () => {
        describe('get/set', () => {
            it('should get/set specific templatesStore', async () => {
                const options = { alg: 'green-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.setState(options);
                const etcdGet = await etcd.algorithms.templatesStore.getState(options);
                expect(etcdGet).to.equal(options.data);
            });
            it('should get all templatesStore', async () => {
                const pipelines = await etcd.algorithms.templatesStore.list();
                expect(pipelines).to.be.an('array');
            });
        });
        describe('watch', () => {
            it('should watch specific templatesStore', async () => {
                const options = { alg: 'green-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.watch(options);
                etcd.algorithms.templatesStore.on('change', (res) => {
                    expect(res).to.deep.equal(options);
                    _semaphore.callDone();
                });
                await etcd.algorithms.templatesStore.setState(options);
                await _semaphore.done();
            });
            it('should get data when call to watch', async () => {
                const options = { alg: 'blue-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.setState(options);
                const etcdGet = await etcd.algorithms.templatesStore.watch(options);
                expect(etcdGet).to.have.deep.keys(options);
            });
            it('should watch all templatesStore', async () => {
                const options1 = {};
                const options2 = { alg: 'yellow-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.watch();
                etcd.algorithms.templatesStore.on('change', (res) => {
                    if (res.alg === options2.alg) {
                        expect(res).to.deep.equal(options2);
                        _semaphore.callDone();
                    }
                });
                await etcd.algorithms.templatesStore.setState(options2);
                await _semaphore.done();
            });
        });
        describe('unwatch', () => {
            it('should unwatch specific templatesStore', async () => {
                let isCalled = false;
                const options = { alg: 'black-alg', data: 'bla' };
                await etcd.algorithms.templatesStore.watch(options);
                etcd.algorithms.templatesStore.on('change', (res) => {
                    isCalled = true;
                });
                await etcd.algorithms.templatesStore.unwatch(options);
                await etcd.algorithms.templatesStore.setState(options);
                await delay(1000);
                expect(isCalled).to.equal(false);
            });
        });
    });
});