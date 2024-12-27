require('dotenv').config();
require('colors');

const { CronJob } = require('cron');
const fs = require('fs');
const moment = require('moment');
const readlineSync = require('readline-sync');

const { Wallet } = require('ethers');
const { provider } = require('../src/utils/config');
const { CHECKIN_ABI } = require('../src/ABI/checkinAbi');
const { displayHeader } = require('../src/utils/utils');

const CONTRACT = CHECKIN_ABI.at(-1).CA;
const PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));

const MAX_ATTEMPTS = 10;
const walletsCheckedIn = new Set();

async function checkDailyStreak(wallet) {
  let attemptCount = 0;

  while (attemptCount < MAX_ATTEMPTS) {
    try {
      if (walletsCheckedIn.has(wallet.address)) {
        console.log(
          `[${moment().format('HH:mm:ss')}] 钱包 ${wallet.address} 已经签到过了。跳过...`.yellow
        );
        return;
      }

      const feeData = await wallet.provider.getFeeData();
      const nonce = await provider.getTransactionCount(wallet.address);
      const gasFee = feeData.gasPrice;
      const gasLimit = await wallet.estimateGas({
        data: CHECKIN_ABI.at(-1).data,
        to: CONTRACT,
      });
      const tx = {
        to: CONTRACT,
        from: wallet.address,
        nonce,
        data: CHECKIN_ABI.at(-1).data,
        gas: gasLimit,
        gasPrice: gasFee,
      };

      const result = await wallet.sendTransaction(tx);
      if (result.hash) {
        console.log(
          `[${moment().format('HH:mm:ss')}] 钱包 ${wallet.address} 的每日签到成功！ 🌟`.green
        );
        console.log(
          `[${moment().format('HH:mm:ss')}] 交易哈希: https://testnet-explorer.plumenetwork.xyz/tx/${
            result.hash
          }`.green
        );
        console.log('');
        walletsCheckedIn.add(wallet.address); 
        return; 
      }
    } catch (error) {
      console.log(
        `[${moment().format('HH:mm:ss')}] 钱包 ${wallet.address} 签到失败。重试(${attemptCount + 1})... 🚫`.red
      );
      console.log('');
      attemptCount++;
      await new Promise((resolve) => setTimeout(resolve, 10000)); 
    }
  }

  console.log(
    `[${moment().format('HH:mm:ss')}] 钱包 ${wallet.address} 在 ${MAX_ATTEMPTS} 次尝试后失败。转到下一个钱包。 ❌`.red
  );
}

async function runCheckIn() {
  displayHeader();
  console.log('');
  for (const privateKey of PRIVATE_KEYS) {
    try {
      const wallet = new Wallet(privateKey, provider);
      await checkDailyStreak(wallet);
    } catch (error) {
      console.log(`[${moment().format('HH:mm:ss')}] 错误: ${error}`.red);
    }
  }
}

const userChoice = readlineSync.question(
  '您想运行签到程序吗？\n0: 一次性运行\n1: 使用cron自动化（每24小时一次）\n选择 0 或 1: '
);

if (userChoice === '0') {
  runCheckIn();
} else if (userChoice === '1') {
  async function scheduleCheckIn() {
    await runCheckIn();
    const waitTime = 24 * 60 * 60 * 1000 + 5 * 60 * 1000;
    setTimeout(scheduleCheckIn, waitTime);
  }

  scheduleCheckIn()
    .then(() => {
      console.log(
        '已启动签到计划！每24小时5分钟后将自动运行签到。 🕒'.cyan
      );
    })
    .catch((error) => {
      console.log(
        `[${moment().format('HH:mm:ss')}] 在计划签到之前运行时发生错误: ${error}`.red
      );
    });
} else {
  console.log(
    '无效选择！请重新运行脚本并选择0或1。'.red
  );
}
