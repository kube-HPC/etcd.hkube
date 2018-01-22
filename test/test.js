
const { expect } = require('chai');
const Etcd = require('../index');
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
    describe('etcd-discovery', () => {
        it('should register key and update ttl according to interval', async () => {
            const instanceId = `register-test-${uuidv4()}`;
            try {
                const putEvent = sinon.spy();
                const changeEvent = sinon.spy();
                const deleteEvent = sinon.spy();
                const expireEvent = sinon.spy();
                const watch = await etcd.discovery.watch({ instanceId });
                expect(watch).to.have.property('watcher');
                //   expect(watch).to.have.property('obj');
                expect(watch.data).to.be.empty;
                watch.watcher.on('disconnected', () => console.log('disconnected...'));
                watch.watcher.on('connected', () => console.log('successfully reconnected!'));
                watch.watcher.on('put', (res) => {
                    console.log('testLease:', res.value.toString());
                    putEvent();
                });
                watch.watcher.on('delete', (res) => {
                    console.log('testdeleteLease:', res.value.toString());
                    deleteEvent();
                });
                watch.watcher.on('data', () => {
                    changeEvent();
                    console.log('testdaraLease:');
                    _semaphore.callDone();
                });
                await etcd.discovery.register({
                    ttl: 10, instanceId, data: { bla: 'bla' }
                });
                await _semaphore.done({ doneAmount: 1 });
                watch.watcher.removeAllListeners();

                expect(changeEvent.callCount).to.be.equal(1);
                expect(putEvent.callCount).to.be.equal(1);
                expect(expireEvent.callCount).to.be.equal(0);
                expect(deleteEvent.callCount).to.be.equal(0);
            }
            catch (e) {
                console.error(e);
            }
        }).timeout(5000);

        it('should cancel after revoke', async () => {
            const instanceId = `register-test-${uuidv4()}`;
            const putEvent = sinon.spy();
            const changeEvent = sinon.spy();
            const deleteEvent = sinon.spy();
            const watch = await etcd.discovery.watch({ instanceId });
            expect(watch).to.have.property('watcher');
            expect(watch.data).to.be.empty;
            watch.watcher.on('disconnected', () => console.log('disconnected...'));
            watch.watcher.on('connected', () => console.log('successfully reconnected!'));
            watch.watcher.on('put', () => {
                putEvent();
                _semaphore.callDone();
            });
            watch.watcher.on('delete', () => {
                deleteEvent();
                _semaphore.callDone();
            });
            watch.watcher.on('data', () => {
                changeEvent();
                // callDone();
            });
            const lease = await etcd.discovery.register({
                ttl: 1, instanceId, data: { bla: 'bla' }
            });
            lease.close();
            await delay(2000);
            await _semaphore.done({ doneAmount: 2 });
            _semaphore = null;
            watch.watcher.removeAllListeners();
            expect(changeEvent.callCount).to.be.equal(2);
            expect(putEvent.callCount).to.be.equal(1);
            expect(deleteEvent.callCount).to.be.equal(1);
        }).timeout(10000);

        it('should update data', async () => {
            const instanceId = `'update-data-test-${uuidv4()}`;
            const setEvent = sinon.spy();
            let data = { bla: 'bla' };
            const watch = await etcd.discovery.watch({ instanceId });

            watch.watcher.on('put', (d) => {
                expect(JSON.parse(d.value.toString())).to.have.deep.keys(data);
                data = { bla: 'bla2' };
                setEvent();
                _semaphore.callDone();
                if (JSON.parse(d.value.toString()).bla === 'bla2') {
                    return;
                }
                etcd.discovery.updateRegisteredData(data);
            });
            await etcd.discovery.register({
                ttl: 4, instanceId, data
            });

            await _semaphore.done({ doneAmount: 2 });
            watch.watcher.removeAllListeners();
            expect(setEvent.callCount).to.be.equal(2);
        }).timeout(10000);
    });
    describe('etcd set get', () => {
        it('etcd set and get simple test', async () => {
            const instanceId = `'etcd-set-get-test-${uuidv4()}`;
            const data = { data: { bla: 'bla' } };
            await etcd.services.set({ data, instanceId });
            const etcdGet = await etcd.services.get({ instanceId, prefix: 'services' });
            expect(etcdGet.data).to.have.deep.keys(data.data);
        }).timeout(1000);
        it('etcd sort with limit', async () => {
            const instanceId = `'etcd-set-get-test-${uuidv4()}`;
            for (let i = 0; i < 10; i++) {
                await etcd.etcd3.put(`${instanceId}/${i}`, { val: `val${i}` }, null);
                await delay(100);
            }
            await delay(200);
            const data = await etcd.etcd3.getSortLimit(`${instanceId}`, ['Mod', 'Ascend'], 6);
            expect(JSON.parse(data[Object.keys(data)[0]]).val).to.equal('val0');
            expect(Object.keys(data).length).to.equal(6);
        });
    });
    describe('services', () => {
        describe('get/set', () => {
            it('should get without specific instanceId', async () => {
                const data = { data: { bla: 'bla' } };
                await etcd.services.set(data);
                const etcdGet = await etcd.services.get({ prefix: 'services' });
                expect(etcdGet).to.have.deep.keys(data.data);
            }).timeout(10000);
            it('should get without specific instanceId with suffix', async () => {
                const suffix = 'test';
                const data = { data: { bla: 'bla' } };
                await etcd.services.set({ data, suffix });
                const etcdGet = await etcd.services.get({ prefix: 'services', suffix });
                expect(etcdGet.data).to.have.deep.keys(data.data);
            }).timeout(10000);
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
    describe('jobs', () => {
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
    describe('jobResults', () => {
        describe('sets', () => {
            it('should set and get results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobResults.setResults({ data, jobId });
                const etcdGet = await etcd.jobResults.getResult({ jobId });
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
            it('should set and get result status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                const status = 'special';
                await etcd.jobResults.setLog({ data, jobId });
                await etcd.jobResults.setLog({ data, jobId });
                await etcd.jobResults.setResults({ data, jobId });
                await etcd.jobResults.setResults({ data, jobId });
                await etcd.jobResults.setStatus({ data: status, jobId });
                await etcd.jobResults.setStatus({ data: status, jobId });
                const etcdGet = await etcd.jobResults.getResultsByStatus({ status });
                expect(etcdGet).to.be.an('array');
                expect(etcdGet[0]).to.have.property('jobId');
                expect(etcdGet[0]).to.have.property('log');
                expect(etcdGet[0]).to.have.property('result');
                expect(etcdGet[0]).to.have.property('status');
            });
            it('should set and get log', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { jobId, status: 'sent' };
                await etcd.jobResults.setLog({ data, jobId });
                const etcdGet = await etcd.jobResults.getLog({ jobId });
                expect(etcdGet).to.deep.equal(data);
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
    describe('tasks', () => {
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
                    etcd.tasks.unwatch();
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
                    expect(error.message).to.equals(`already watching ${JSON.stringify({ jobId, taskId })}`);
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
    describe('execution', () => {
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
    describe('pipelines', () => {
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
                    console.log(res);
                    expect({ name, data }).to.have.deep.keys(res);
                    etcd.pipelines.unwatch();
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
                    etcd.pipelines.unwatch();
                    _semaphore.callDone();
                });
                await etcd.pipelines.setPipeline({ name, data });
                await _semaphore.done();
            });
        });
    });
});