
const { expect } = require('chai');
const Etcd = require('../index');
const { done, callDone, semaphore } = require('await-done');
const sinon = require('sinon');
const delay = require('await-delay');
const uuidv4 = require('uuid/v4');
const path = require('path');
const Etcd3 = require('../etcd3-client');
let etcd = new Etcd();
const SERVICE_NAME = 'my-test-service';
let etcd3 = null;
let _semaphore = null;
describe('etcd-tests', () => {
    beforeEach(async () => {
        etcd = new Etcd();
        //  etcd3 = new Etcd3({ hosts: `http://localhost:4001` })
        await etcd.init({ etcd: { host: 'localhost', port: 4001 }, serviceName: SERVICE_NAME });
        console.log('creating new semaphore');
        _semaphore = new semaphore();
    })

    describe('etcd-discovery', () => {
        it('should register key and update ttl according to interval', async () => {
            let instanceId = `register-test-${uuidv4()}`
            try {
                let putEvent = sinon.spy();
                let changeEvent = sinon.spy();
                let deleteEvent = sinon.spy();
                let expireEvent = sinon.spy();
                let watch = await etcd.discovery.watch({ instanceId });
                expect(watch).to.have.property('watcher')
                //   expect(watch).to.have.property('obj');
                expect(watch.data).to.be.empty;
                watch.watcher.on('disconnected', () => console.log('disconnected...'))
                watch.watcher.on('connected', () => console.log('successfully reconnected!'))
                watch.watcher.on('put', res => {
                    console.log('testLease:', res.value.toString())
                    putEvent();
                })
                watch.watcher.on('delete', res => {
                    console.log('testdeleteLease:', res.value.toString())
                    deleteEvent();
                })
                watch.watcher.on('data', res => {
                    changeEvent();
                    console.log('testdaraLease:')
                    _semaphore.callDone();
                })
                await etcd.discovery.register({ ttl: 10, interval: 1000, instanceId, data: { bla: 'bla' } });


                await _semaphore.done({ doneAmount: 1 });
                watch.watcher.removeAllListeners()

                expect(changeEvent.callCount).to.be.equal(1);
                expect(putEvent.callCount).to.be.equal(1);
                expect(expireEvent.callCount).to.be.equal(0);
                expect(deleteEvent.callCount).to.be.equal(0);

            } catch (e) {
                console.error(e);
            } finally {

            }


        }).timeout(5000);

        it('should cancel after revoke', async () => {
            let instanceId = `register-test-${uuidv4()}`
            try {
                let putEvent = sinon.spy();
                let changeEvent = sinon.spy();
                let deleteEvent = sinon.spy();
                let watch = await etcd.discovery.watch({ instanceId });
                expect(watch).to.have.property('watcher')
                //   expect(watch).to.have.property('obj');
                expect(watch.data).to.be.empty;
                watch.watcher.on('disconnected', () => console.log('disconnected...'))
                watch.watcher.on('connected', () => console.log('successfully reconnected!'))
                watch.watcher.on('put', res => {
                    console.log('test put Lease:', res.value.toString())
                    putEvent();
                    _semaphore.callDone();
                })
                watch.watcher.on('delete', res => {
                    console.log('test delete Lease:', res.value.toString())
                    deleteEvent();
                    _semaphore.callDone();
                })
                watch.watcher.on('data', res => {
                    changeEvent();
                    console.log('test data Lease:')
                    //callDone();

                })
                let lease = await etcd.discovery.register({ ttl: 5, interval: 1000, instanceId, data: { bla: 'bla' } });
                lease.close();
                await delay(2000);
                console.log(`before await done`)
                await _semaphore.done({ doneAmount: 2 });
                _semaphore = null;
                console.log(`after await done`)
                watch.watcher.removeAllListeners()
                console.log(`revived two calldone() `, changeEvent.callCount, putEvent.callCount, deleteEvent.callCount);
                expect(changeEvent.callCount).to.be.equal(2);
                expect(putEvent.callCount).to.be.equal(1);
                expect(deleteEvent.callCount).to.be.equal(1);

            } catch (e) {
                console.error(e);
            }
        }).timeout(26000);

        it('should update data', async () => {
            let instanceId = `'update-data-test-${uuidv4()}`
            let setEvent = sinon.spy();
            let data = { bla: 'bla' };
            let watch = await etcd.discovery.watch({ instanceId });

            watch.watcher.on('put', d => {
                expect(JSON.parse(d.value.toString())).to.have.deep.keys(data)
                data = { bla: 'bla2' };
                setEvent();
                _semaphore.callDone();
                if (JSON.parse(d.value.toString()).bla == 'bla2') {
                    return;
                }
                else {
                    etcd.discovery.updateRegisteredData(data);
                }
                console.log('calling put', d.value.toString());
            });
            await etcd.discovery.register({ ttl: 4, interval: 2000, instanceId, data });

            await _semaphore.done({ doneAmount: 2 });
            watch.watcher.removeAllListeners()
            expect(setEvent.callCount).to.be.equal(2);
        }).timeout(10000)
    });
    describe('etcd set get', () => {
        it('etcd set and get simple test', async () => {
            let instanceId = `'etcd-set-get-test-${uuidv4()}`
            let data = { data: { bla: 'bla' } }
            let etcdSet = await etcd.services.set({ data, instanceId })
            let etcdGet = await etcd.services.get({ instanceId, prefix: 'services' })
            expect(etcdGet.data).to.have.deep.keys(data.data)
        }).timeout(1000);
        it('etcd sort with limit', async () => {
            let instanceId = `'etcd-set-get-test-${uuidv4()}`
            for (let i = 0; i < 10; i++) {
                let a = await etcd.etcd3.put(`${instanceId}/${i}`, { val: `val${i}` }, null)
                await delay(100);
            }
            await delay(200);
            let data = await etcd.etcd3.getSortLimit(`${instanceId}`, ["Mod", "Ascend"], 6);
            expect(JSON.parse(data[Object.keys(data)[0]]).val).to.equal(`val0`)
            expect(Object.keys(data).length).to.equal(6)
        });
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
        await etcd.init({ etcd: { host: 'localhost', port: 4001 }, serviceName: SERVICE_NAME });
        _semaphore = new semaphore();
    });
    describe('services', () => {
        it('should get instance id without specific instanceId as a set param', async () => {
            let data = { data: { bla: 'bla' } }
            let etcdSet = await etcd.services.set(data)
            let etcdGet = await etcd.services.get({ instanceId, prefix: 'services' })
            expect(etcdGet).to.have.deep.keys(data.data)
        }).timeout(10000);
        it('should able to send suffix', async () => {
            let suffix = 'test'
            let data = { data: { bla: 'bla' } };
            let etcdSet = await etcd.services.set({ data, suffix })
            let etcdGet = await etcd.services.get({ instanceId, prefix: 'services', suffix })
            expect(etcdGet.data).to.have.deep.keys(data.data)
        }).timeout(10000);

    });
    describe('pipeline driver api', () => {
        it('should set and get tasks', async () => {
            let { pipelineDriver } = etcd.services;
            const jobId = `jobid-${uuidv4()}`;
            let taskId = `taskid-${uuidv4()}`;
            let data = { bla: 'bla' };
            let etcdSet = await pipelineDriver.setTaskState({ jobId, taskId, data });
            let etcdGet = await pipelineDriver.getTaskState({ jobId, taskId });
            expect(etcdGet).to.have.deep.keys(data);
        });

        it('should get list', async () => {
            let { pipelineDriver } = etcd.services;

            let taskId = `taskid-${uuidv4()}`;
            let data = { bla: 'bla' };
            let etcdSet = await pipelineDriver.setTaskState({ taskId, data });
            let etcdGet = await pipelineDriver.getDriverTasks({ taskId });
            expect(etcdGet[Object.keys(etcdGet)[0]]).to.have.deep.keys({ taskId, ...data });
        });
        xit('should delete state', async () => {
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
            it('jobs:should set results', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { bla: 'bla' };
                let etcdSet = await etcd.jobResults.setResults({ data: data, jobId: jobId });
                let etcdGet = await etcd.jobResults.getResult({ jobId: jobId });
                //  expect(etcdSet.node.key).to.equal(`/jobResults/${jobId}/result`);
                expect(etcdGet).to.have.deep.keys(data)
            });
            it('jobs:should get results by status', async () => {
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
            it('jobs:should set status', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const data = { status: 'completed' };
                let etcdSet = await etcd.jobResults.setStatus({ data: data, jobId: jobId });
                let etcdGet = await etcd.jobResults.getStatus({ jobId: jobId });
                // expect(etcdSet.node.key).to.equal(`/jobResults/${jobId}/status`);
                expect(etcdGet).to.have.deep.keys(data);
            });
        });
        describe('jobs:watch', () => {
            it('jobs:should watch results', async () => {

                const data = { bla: 'bla' };
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('result-change', (res) => {
                    expect(res.jobId).to.equal(jobId);
                    expect(res.bla).to.equal(data.bla);
                    etcd.jobResults.unwatch();
                    _semaphore.callDone();

                });
                etcd.jobResults.setResults({ data, jobId });
                await _semaphore.done();
            });
            it('jobs:should watch status', async () => {
                const data = { status: 'completed' };
                const jobId = `jobid-${uuidv4()}`;
                await etcd.jobResults.watch({ jobId });
                etcd.jobResults.on('status-change', (res) => {
                    expect(res.jobId).to.equal(jobId);
                    expect(res.status).to.equal(data.status);
                    _semaphore.callDone();
                });
                etcd.jobResults.setStatus({ data, jobId });
                await _semaphore.done();
            });
        });
    });
    describe('tasks', () => {
        describe('sets', () => {
            const jobID = `jobid-${uuidv4()}`;
            it('task: should set results', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                const etcdSet = await etcd.tasks.setState({ jobId: jobID, taskId, status: data.status, result: data.result });
                const etcdGet = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('task: should set status', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { status: 'failed', error: 'stam error' };
                let etcdSet = await etcd.tasks.setState({ jobId: jobID, taskId, status: data.status, error: data.error });
                let etcdGet = await etcd.tasks.getState({ jobId: jobID, taskId });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('task: should get jobs tasks', async () => {
                const taskId = `taskid-${uuidv4()}`;
                const data = { status: 'failed', error: 'stam error' };
                await etcd.tasks.setState({ jobId: jobID, taskId, status: data.status, error: data.error });
                await etcd.tasks.setState({ jobId: jobID, taskId, status: data.status, error: data.error });
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
                    expect({ jobId, ...data, taskId }).to.have.deep.keys(res);
                    await etcd.tasks.unwatch({ jobId, taskId });
                    _semaphore.callDone();
                });
                etcd.tasks.setState({ jobId, taskId, status: data.status, result: data.result });
                await _semaphore.done();
            });
            it('should watch all keys', async () => {
                const jobId = `jobid-${uuidv4()}`;
                const taskId = `taskid-${uuidv4()}`;
                const data = { result: { bla: 'bla' }, status: 'complete' };
                const watch = await etcd.tasks.watch({ jobId });
                etcd.tasks.on('change', async (res) => {
                    const obj = { ...data, jobId, taskId };
                    expect(obj).to.have.deep.keys(res);
                    etcd.tasks.unwatch();
                    _semaphore.callDone();
                });
                etcd.tasks.setState({ jobId, taskId, status: data.status, result: data.result });
                await _semaphore.done();
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
            it('pipeline:should set results', async () => {
                const name = `pipeline-1`;
                const data = { bla: 'bla' };
                const etcdSet = await etcd.pipelines.setPipeline({ name, data });
                const etcdGet = await etcd.pipelines.getPipeline({ name });
                expect(etcdGet).to.have.deep.keys(data);
            });
            it('pipeline:should get all pipelines', async () => {
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
                    console.log(res);
                    expect({ name, data }).to.have.deep.keys(res)
                    etcd.pipelines.unwatch();
                    _semaphore.callDone();

                });
                await etcd.pipelines.setPipeline({ name, data });
                await _semaphore.done();
            });
            it('should watch all pipelines', async () => {
                const name = `pipeline-3`;
                const data = { bla: 'bla' };
                await etcd.pipelines.watch()
                etcd.pipelines.on('change', (res) => {
                    expect({ name, data }).to.have.deep.keys(res)
                    etcd.pipelines.unwatch();
                    _semaphore.callDone()
                });
                await etcd.pipelines.setPipeline({ name, data });
                await _semaphore.done();
            });
        });
    });
})