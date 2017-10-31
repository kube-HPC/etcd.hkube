const { expect } = require('chai');
const Etcd = require('../lib/etcdDiscovery');
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
    after(async () => {
        let { pipelineDriver } = etcd.services;
        let etcdDelete = await pipelineDriver.deleteState();
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
            let etcdSet = await pipelineDriver.setTaskState(taskId, data);
            let etcdGet = await pipelineDriver.getTaskState(taskId);
            expect(JSON.parse(etcdSet.node.value)).to.have.deep.keys(data);
        });
        it('should delete state', async () => {
            let { pipelineDriver } = etcd.services;
            let taskId = `taskid-${uuidv4()}`;
            let data = { bla: 'bla' };
            let etcdSet = await pipelineDriver.setState(data);
            let etcdDelete = await pipelineDriver.deleteState();
            let etcdGet = await pipelineDriver.getState();
            expect(etcdGet).to.equal(null);
        });
    });
    describe('jobs', () => {
        describe('sets', () => {
            it('should set results', async () => {
                let etcdSet = await etcd.jobs.setTaskResult({ bla: 'bla' });
                let etcdGet = await etcd.jobs.getTaskResult();
                expect(JSON.parse(etcdSet.node.value)).to.have.deep.keys(JSON.parse(etcdGet.node.value))
            });
            it('should set status', async () => {
                let etcdSet = await etcd.jobs.setTaskStatus({ bla: 'bla' });
                let etcdGet = await etcd.jobs.getTaskStatus();
                expect(JSON.parse(etcdSet.node.value)).to.have.deep.keys(JSON.parse(etcdGet.node.value))
            });
            it('should get jobs tasks', async () => {
                let jobs = await etcd.jobs.getJobsTasks();
                //expect(jobs).to.be.equal(1);
            });
        });
        describe('watch', () => {
            it('should onTaskResult', async () => {
                //const taskID = `taskid-${uuidv4()}`;
                const data = { bla: 'bla' };
                await etcd.jobs.onTaskResult({ taskId }, (result) => {
                    expect(result).to.have.deep.keys(data)
                });
                etcd.jobs.setTaskResult(data);
            });
            it('should onJobResult', async () => {
                const data = { bla: 'bla' };
                await etcd.jobs.onJobResult((result) => {
                    expect(result).to.have.deep.keys(data)
                });
                etcd.jobs.setJobResults({ data });
            });
        });
    });
})
//etcdDiscovery.register({ ttl: 10, interval: 1000, servicePath: 'bla/bla', instanceId: '12345', data: { bla: 'bla' } })