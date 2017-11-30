const { expect } = require('chai');
const Etcd = require('../index');
const { done, callDone } = require('await-done');
const sinon = require('sinon');
const delay = require('await-delay');
const uuidv4 = require('uuid/v4');
const path = require('path');
let etcd = new Etcd();
const SERVICE_NAME = 'my-test-service';

describe('etcd-tests', () => {
    beforeEach(async () => {
        etcd = new Etcd();
        await etcd.init({ etcd: { host: 'localhost', port: 4001 }, serviceName: SERVICE_NAME });
    })

    describe('etcd-discovery', () => {
        it('should register key and update ttl according to interval', async () => {
            let instanceId = `register-test-${uuidv4()}`
            await etcd.discovery.register({ ttl: 10, interval: 1000, instanceId, data: { bla: 'bla' } });
            let watch = await etcd.discovery.watch({ instanceId });
            let setEvent = sinon.spy();
            let changeEvent = sinon.spy();
            let deleteEvent = sinon.spy();
            let expireEvent = sinon.spy();
            expect(watch).to.have.property('watcher')
            expect(watch).to.have.property('obj');
            expect(watch.obj).to.be.empty;
            watch.watcher.on('set', d => {
                setEvent();
            });

            watch.watcher.on('change', d => {
                changeEvent();
                callDone();
            });
            watch.watcher.on('expire', d => {
                expireEvent();
            });
            watch.watcher.on('delete', d => {
                deleteEvent();
            });

            await done({ doneAmount: 2 });
            watch.watcher.removeAllListeners()

            expect(changeEvent.callCount).to.be.equal(2);
            expect(setEvent.callCount).to.be.equal(2);
            expect(expireEvent.callCount).to.be.equal(0);
            expect(deleteEvent.callCount).to.be.equal(0);


        }).timeout(5000);

        it('should run register and send  expiration after x seconds', async () => {
            let instanceId = `ttl-test-${uuidv4()}`
            let expireEvent = sinon.spy();
            let setEvent = sinon.spy();
            await etcd.discovery.register({ ttl: 4, interval: 1000, instanceId, data: { bla: 'bla' } });
            let watch = await etcd.discovery.watch({ instanceId });
            watch.watcher.on('set', d => {
                setEvent();
                etcd.discovery.pause();
            });
            watch.watcher.on('expire', d => {
                expireEvent();
                callDone()
            });

            await done();
            expect(expireEvent.callCount).to.be.equal(1);
        }).timeout(26000);

        it('should update data', async () => {
            let instanceId = `'update-data-test-${uuidv4()}`
            let setEvent = sinon.spy();
            let data = { bla: 'bla' };
            await etcd.discovery.register({ ttl: 4, interval: 2000, instanceId, data });
            let watch = await etcd.discovery.watch({ instanceId });
            watch.watcher.on('set', d => {
                expect(JSON.parse(d.node.value)).to.have.deep.keys(data)
                data = { bla: 'bla2' };
                etcd.discovery.updateRegisteredData(data);
                setEvent();
                callDone();
            });

            await done({ doneAmount: 2 });
            expect(setEvent.callCount).to.be.equal(2);
        }).timeout(10000)
    });
    describe('etcd set get', () => {
        it('etcd set and get simple test', async () => {
            let instanceId = `'etcd-set-get-test-${uuidv4()}`
            let etcdSet = await etcd.services.set({ data: { bla: 'bla' }, instanceId })
            let etcdGet = await etcd.services.get({ instanceId, prefix: 'services' })
            expect(JSON.parse(etcdSet.node.value)).to.have.deep.keys(JSON.parse(etcdGet.node.value))
        }).timeout(10000);
    });
})

describe('etcd test init with instanceId ', () => {
    let instanceId = '';
    let jobId = '';
    let taskId = '';
    beforeEach(async () => {
        etcd = new Etcd();
        instanceId = `etcd-set-get-test-${uuidv4()}`;
        jobId = `jobid-${uuidv4()}`;
        taskId = `taskid-${uuidv4()}`;
        await etcd.init({ etcd: { host: 'localhost', port: 4001 }, serviceName: SERVICE_NAME, instanceId, jobId, taskId });
    });
    describe('services', () => {
        it('should get instance id without specific instanceId as a set param', async () => {
            let etcdSet = await etcd.services.set({ data: { bla: 'bla' } })
            let etcdGet = await etcd.services.get({ instanceId, prefix: 'services' })
            expect(JSON.parse(etcdSet.node.value)).to.have.deep.keys(JSON.parse(etcdGet.node.value))
        }).timeout(10000);
        it('should able to send suffix', async () => {
            let suffix = 'test'
            let etcdSet = await etcd.services.set({ data: { bla: 'bla' }, suffix })
            let etcdGet = await etcd.services.get({ instanceId, prefix: 'services', suffix })
            expect(JSON.parse(etcdSet.node.value)).to.have.deep.keys(JSON.parse(etcdGet.node.value))
        }).timeout(10000);

    });
    describe('pipeline driver api', () => {
        it('should set and get tasks', async () => {
            let { pipelineDriver } = etcd.services;
            let taskId = `taskid-${uuidv4()}`;
            let data = { bla: 'bla' };
            let etcdSet = await pipelineDriver.setTaskState({ taskId, data });
            let etcdGet = await pipelineDriver.getTaskState({ taskId });
            expect(JSON.parse(etcdSet.node.value)).to.have.deep.keys(data);
        });
        it('should delete state', async () => {
            let { pipelineDriver } = etcd.services;
            const jobId = `jobid-${uuidv4()}`;
            let taskId = `taskid-${uuidv4()}`;
            let data = { bla: 'bla' };
            let etcdSet = await pipelineDriver.setState({ jobId, taskId });
            let etcdDelete = await pipelineDriver.deleteState({ jobId });
            let etcdGet = await pipelineDriver.getState({ jobId });
            expect(etcdGet).to.equal(null);
        });
    });
    describe('jobs', () => {
        describe('sets', () => {
            it('should set state', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const state = 'started';
                let etcdSet = await etcd.jobs.setState({ state, jobId });
                let etcdGet = await etcd.jobs.getState({ jobId });
                expect(etcdSet.node.key).to.equal(`/jobs/${jobId}/state`);
                expect(etcdGet.state).to.equal(state);
            });
        });
        describe('watch', () => {
            it('should watch stateChanged', async () => {
                const state = 'started';
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobs.watch({ jobId });
                etcd.jobs.on('change', (res) => {
                    expect(res.state).to.equal(state);
                });
                etcd.jobs.setState({ state, jobId });
            });
            it('should unwatch stateChanged', async () => {
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
        });
    });
    describe('jobResults', () => {
        describe('sets', () => {
            it('should set results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                let etcdSet = await etcd.jobResults.setResults({ data: data, jobId: jobId });
                let etcdGet = await etcd.jobResults.getResult({ jobId: jobId });
                expect(etcdSet.node.key).to.equal(`/jobResults/${jobId}/result`);
                expect(etcdGet).to.have.deep.keys(data)
            });
            it('should get results by status', async () => {
                const jobId1 = `jobid-${uuidv4()}`;
                const jobId2 = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                const status = 'completed';
                await etcd.jobResults.setResults({ data: data, jobId: jobId1 });
                await etcd.jobResults.setResults({ data: data, jobId: jobId2 });
                await etcd.jobResults.setStatus({ data: 'failed', jobId: jobId1 });
                await etcd.jobResults.setStatus({ data: 'completed', jobId: jobId2 });

                let etcdGet = await etcd.jobResults.getResultsByStatus({ status: status });
                expect(etcdGet[0].status).to.equal(status);

            });
            it('should set status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { status: 'completed' };
                let etcdSet = await etcd.jobResults.setStatus({ data: data, jobId: jobId });
                let etcdGet = await etcd.jobResults.getStatus({ jobId: jobId });
                expect(etcdSet.node.key).to.equal(`/jobResults/${jobId}/status`);
                expect(etcdGet).to.have.deep.keys(data);
            });
        });
        describe('watch', () => {
            it('should watch results', async () => {
                const data = { bla: 'bla' };
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('change', (res) => {
                    expect(res.jobId).to.equal(jobId);
                    expect(res.data).to.have.deep.keys(data);
                });
                etcd.jobResults.setResults({ data, jobId });
            });
            it('should watch status', async () => {
                const data = { status: 'completed' };
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('change', (res) => {
                    expect(res.jobId).to.equal(jobId);
                    expect(res.data).to.have.deep.keys(data);
                });
                etcd.jobResults.setStatus({ data, jobId });
            });
        });
    });
    describe('tasks', () => {
        describe('sets', () => {
            const jobID = `jobid-${uuidv4()}`;
            it('should set results', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                const etcdSet = await etcd.tasks.setState({ jobId: jobID, taskId, status: data.status, result: data.result });
                const etcdGet = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should set status', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { status: 'failed', error: 'stam error' };
                let etcdSet = await etcd.tasks.setState({ jobId: jobID, taskId, status: data.status, error: data.error });
                let etcdGet = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('should get jobs tasks', async () => {
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
                const watch = await etcd.tasks.watch({ jobId, taskId });
                etcd.tasks.on('change', async (res) => {
                    expect(data).to.have.deep.keys(res);
                    await etcd.tasks.unwatch({ jobId, taskId });
                });
                etcd.tasks.setState({ jobId, taskId, status: data.status, result: data.result });
            });
            it('should watch all keys', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                const watch = await etcd.tasks.watch({ jobId });
                etcd.tasks.on('change', async (res) => {
                    const obj = Object.assign({}, data, { jobId: jobId, taskId });
                    expect(obj).to.have.deep.keys(res);
                    await etcd.tasks.unwatch({ jobId });
                });
                etcd.tasks.setState({ jobId, taskId, status: data.status, result: data.result });
            });
            it('should return the set obj on watch', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                const etcdSet = await etcd.tasks.setState({ jobId, taskId, status: data.status, result: data.result });
                const watch = await etcd.tasks.watch({ jobId, taskId });
                expect(data).to.have.deep.keys(watch);
            });
            it('should throw error if watch already exists', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const watch = await etcd.tasks.watch({ jobId, taskId });
                try {
                    await etcd.tasks.watch({ jobId, taskId });
                } catch (error) {
                    expect(error.message).to.equals(`already watching ${JSON.stringify({ jobId, taskId })}`);
                }
            });
        });
        describe('unwatch', () => {
            it('should unwatch key', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                const watch = await etcd.tasks.watch({ jobId, taskId });
                etcd.tasks.on('change', (res) => {
                    expect(data).to.have.deep.keys(res);
                });
                const res = await etcd.tasks.unwatch({ jobId, taskId });
                etcd.tasks.setState({ jobId, taskId, status: data.status, result: data.result });
            });
        });
    });
    describe('execution', () => {
        describe('sets', () => {
            const jobID = `jobid-${uuidv4()}`;
            const taskId = `taskid-${uuidv4()}`;
            it('should set results', async () => {
                const pipeline = {
                    "name": "algo6",
                    "nodes": [
                        {
                            "nodeName": "string",
                            "algorithmName": "string",
                            "input": [
                                "string"
                            ]
                        }
                    ],
                    "flowInput": {},
                    "webhook": {
                        "progressHook": "string",
                        "resultHook": "string"
                    }
                }
                const etcdSet = await etcd.execution.setExecution({ jobId: jobID, data: pipeline });
                const etcdGet = await etcd.execution.getExecution({ jobId: jobID });
                expect(pipeline).to.have.deep.keys(etcdGet);
            });
        });
    });
    describe('pipelines', () => {
        describe('sets', () => {
            it('should set results', async () => {
                const name = `pipeline-1`;
                const data = { bla: 'bla' };
                const etcdSet = await etcd.pipelines.setPipeline({ name, data });
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
                const name = `pipeline-delete`;
                const data = { bla: 'bla' };
                const etcdSet = await etcd.pipelines.setPipeline({ name, data });
                const etcdDelete = await etcd.pipelines.deletePipeline({ name });
                const etcdGet = await etcd.pipelines.getPipeline({ name });
                expect(etcdGet).to.be.null;
            });
        });
        describe('watch', () => {
            it('should watch specific pipeline', async () => {
                const name = `pipeline-2`;
                const data = { bla: 'bla' };
                await etcd.pipelines.watch({ name });
                etcd.pipelines.on('change', (res) => {
                    expect({ name, data }).to.have.deep.keys(res)
                });
                etcd.pipelines.setPipeline({ name, data });
            });
            it('should watch all pipelines', async () => {
                const name = `pipeline-3`;
                const data = { bla: 'bla' };
                await etcd.pipelines.watch()
                etcd.pipelines.on('change', (res) => {
                    expect({ name, data }).to.have.deep.keys(data)
                });
                etcd.pipelines.setPipeline({ name, data });
            });
        });
    });
})