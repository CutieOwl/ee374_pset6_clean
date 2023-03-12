const { canonicalize } = require('json-canonicalize');
import blake2 from 'blake2';
const { parentPort, workerData } = require('worker_threads');
//import * as fs from 'fs';

const MINER_NAME = "kathli Miner Bounty Hunter";
const STUDENT_IDS = ["kathli"];
const TARGET = "00000000abc00000000000000000000000000000000000000000000000000000";
const GENESIS_ID = "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2";
const ZEROS = "0000000000000000000000000000000000000000000000000000000000000000"

const NONCE_MOD = 5000000;

const PUBLICKEY = "e330f8ec49d632126b84bc39a79a614012b20fd9b8f38cfeb9450bdb6a047d22";

function myHash(str: string) {
  const hash = blake2.createHash('blake2s')
  hash.update(Buffer.from(str))
  const hashHex = hash.digest('hex')

  return hashHex
}

function main(workerData: any) {
  let nonce: number = 0;
  let previd: string = GENESIS_ID;
  let tipheight: number = 0;
  let mempooltxs: string[] = [];
  let minername: string = MINER_NAME;
  if (workerData.hasOwnProperty("chainheight")) {
    tipheight = workerData.chainheight;
  }
  if (workerData.hasOwnProperty("mempooltxs")) {
    mempooltxs = workerData.mempooltxs;
  }
  if (workerData.hasOwnProperty("chaintip")) {
    previd = workerData.chaintip;
  }
  if (workerData.hasOwnProperty("num")) {
    minername = `${minername} ${workerData["num"]}`;
  }
  parentPort.postMessage({type: "mydata", data: `workerData: ${workerData} workerDataNum ${workerData["num"]} minername ${minername} chainheight ${workerData.chainheight} chaintip ${workerData.chaintip} mempooltxs ${canonicalize(workerData.mempooltxs)}`})
  let coinbaseTx = {
      type:"transaction", 
      outputs: [{pubkey: PUBLICKEY, value: 50000000000}],
      height: tipheight + 1
      };
  let coinbaseTxHash = myHash(canonicalize(coinbaseTx));

  let txids = [coinbaseTxHash]
  txids = txids.concat(mempooltxs)

  let currtime = Math.floor(Date.now() / 1000);
  let block = {
    T: TARGET, 
    created: currtime, 
    miner: minername, 
    nonce: nonce.toString(16),
    previd: previd,
    studentids: STUDENT_IDS,
    note: "hello!",
    txids: txids,
    type:"block"
  };
  let blockHash = myHash(canonicalize(block));
  while(true) {
    //console.log(`Miner says hello loop\n`);
    //console.log(`Previd: ${previd} tipheight: ${tipheight} mempool ${canonicalize(mempooltxs)}\n`);
    if (blockHash < TARGET) {
        // miner success!
        // broadcast this tx & block & let the gossiping bring it back to us
        parentPort.postMessage({type: "mined", coinbase: coinbaseTx, block: block});
    }
    /*else if (nonce % NONCE_MOD == 0) {
        parentPort.postMessage({type: "update", text: `Still unsuccessfully mining, current blockhash ${blockHash} block ${canonicalize(block)}`});
    }*/
    nonce += 1;
    const newnonceStr = nonce.toString(16);
    block.nonce = ZEROS.substring(newnonceStr.length) + newnonceStr;
    block.created = Math.floor(Date.now() / 1000);
    blockHash = myHash(canonicalize(block));
  }
}

console.log(`In the mining program with workerdata ${workerData}\n`);
main(workerData)