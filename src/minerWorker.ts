const { canonicalize } = require('json-canonicalize');
import blake2 from 'blake2';
import * as fs from 'fs';
const {
    Worker, MessageChannel, MessagePort, isMainThread, parentPort,
  } = require('node:worker_threads');
import { logger } from './logger'
import { network } from './network'
import { chainManager } from './chain'
import { mempool } from './mempool'

const GENESIS_ID = "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2";

const NUM_MINERS = 4;

class MinerWorker {
    myWorkers: Worker[] = []
    currchaintip: string = GENESIS_ID
    currchainheight: number = 0;
    //myWorker: Worker | undefined;
    async init() {
        for (let i = 0; i < NUM_MINERS; ++i) {
            const minerWorkerData = {chaintip: this.currchaintip, chainheight: this.currchainheight, mempooltxs: [], num: i}
            logger.debug(`Initializing miner ${i} with data ${canonicalize(minerWorkerData)}`);
            const myWorker = new Worker('./dist/miner.js', {workerData: minerWorkerData});
            myWorker.on('message', (message: any) => {
                if (message.type == "mined") {
                    logger.debug(`Mined coinbase tx: ${canonicalize(message.coinbase)}`);
                    logger.debug(`Mined block: ${canonicalize(message.block)}`);
                    network.broadcast(message.coinbase);
                    network.broadcast(message.block);
                }
                else {
                    logger.debug(canonicalize(message));
                }
            });
            this.myWorkers.push(myWorker);
            logger.debug(`Initialized miner ${i}`);
        }
        
    }

    async refreshChaintip(chaintipid: string, chaintipheight: number) {
        this.myWorkers.forEach(w => w.terminate());
        this.myWorkers.splice(0, this.myWorkers.length);
        this.currchainheight = chaintipheight
        this.currchaintip = chaintipid

        for (let i = 0; i < NUM_MINERS; ++i) {
            const minerWorkerData = {chaintip: chaintipid, chainheight: chaintipheight, mempooltxs: [], num: i}
            logger.debug(`Refreshing miner ${i} chaintip change with data ${canonicalize(minerWorkerData)}`);
            const myWorker = new Worker('./dist/miner.js', {workerData: minerWorkerData});
            myWorker.on('message', (message: any) => {
                if (message.type == "mined") {
                    logger.debug(`Mined coinbase tx: ${canonicalize(message.coinbase)}`);
                    logger.debug(`Mined block: ${canonicalize(message.block)}`);
                    network.broadcast(message.coinbase);
                    network.broadcast(message.block);
                }
                else {
                    logger.debug(canonicalize(message));
                }
            });
            this.myWorkers.push(myWorker);
            logger.debug(`Refreshed miner ${i}`);
        }
        
    } 

    async refreshMempool(currmempooltxs: string[]) {
        this.myWorkers.forEach(w => w.terminate());
        this.myWorkers.splice(0, this.myWorkers.length);
        for (let i = 0; i < NUM_MINERS; ++i) {
            const minerWorkerData = {chaintip: this.currchaintip, chainheight: this.currchainheight, mempooltxs: currmempooltxs, num: i}
            logger.debug(`Refreshing miner ${i} mempool change with data ${canonicalize(minerWorkerData)}`);
            const myWorker = new Worker('./dist/miner.js', {workerData: minerWorkerData});
            myWorker.on('message', (message: any) => {
                if (message.type == "mined") {
                    logger.debug(`Mined coinbase tx: ${canonicalize(message.coinbase)}`);
                    logger.debug(`Mined block: ${canonicalize(message.block)}`);
                    network.broadcast(message.coinbase);
                    network.broadcast(message.block);
                }
                else {
                    logger.debug(canonicalize(message));
                }
            });
            this.myWorkers.push(myWorker);
            logger.debug(`Refreshed miner ${i}`);
        }

        
    } 
}

export const minerWorker = new MinerWorker();