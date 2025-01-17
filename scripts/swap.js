require('dotenv').config();
require('colors');
const fs = require('fs');
const readlineSync = require('readline-sync');
const { CronJob } = require('cron');
const { execSync } = require('child_process');
const moment = require('moment');

const { SWAP_ABI } = require('../src/ABI/swapAbi');
const { Wallet, Contract } = require('ethers');
const { provider } = require('../src/utils/config');
const { displayHeader, delay } = require('../src/utils/utils');

const dataABI = {
  contractAddress: '0x4c722A53Cf9EB5373c655E1dD2dA95AcC10152D1',
  baseCoin: '0x5c1409a46cd113b3a667db6df0a8d7be37ed3bb3',
  quoteCoin: '0xba22114ec75f0d55c34a5e5a3cf384484ad9e733',
  poolIndex: '36000',
  isBuyOrder: false,
  isBaseQuantity: false,
  tradeQuantity: '1000000000000000',
  tradeTip: '0',
  limitOrderPrice: '65537',
  minimumOutput: '995406972030214000',
  reserveFlags: '0',
};

const CONTRACT_ADDRESS = dataABI.contractAddress;
const BASE_TOKEN = dataABI.baseCoin;
const QUOTE_TOKEN = dataABI.quoteCoin;
const POOL_INDEX = dataABI.poolIndex;
const IS_BUY_ORDER = dataABI.isBuyOrder;
const IS_BASE_QUANTITY = dataABI.isBaseQuantity;
const TRADE_QUANTITY = dataABI.tradeQuantity;
const TRADE_TIP = dataABI.tradeTip;
const LIMIT_ORDER_PRICE = dataABI.limitOrderPrice;
const MINIMUM_OUTPUT = dataABI.minimumOutput;
const RESERVE_FLAGS = dataABI.reserveFlags;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONFIG_FILE = './config.json';

const saveConfig = (config) => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
};

const loadConfig = () => {
  if (fs.existsSync(CONFIG_FILE)) {
    const rawConfig = fs.readFileSync(CONFIG_FILE);
    return JSON.parse(rawConfig);
  }
  return null;
};

let config = loadConfig();

if (!config) {
  const txCountInput = readlineSync.question(
    '您想要进行多少次交易？（默认是1次）： '
  );
  const transactionCount = txCountInput ? parseInt(txCountInput, 10) : 1;

  const autoRunInput = readlineSync.question(
    '您希望每24小时自动运行此脚本吗？（Y/N）： '
  );
  const autoRun = autoRunInput.toLowerCase() === 'y';

  config = { transactionCount, autoRun };
  saveConfig(config);
}

const performTransaction = async () => {
  let success = false;
  while (!success) {
    try {
      const wallet = new Wallet(PRIVATE_KEY, provider);
      const contract = new Contract(CONTRACT_ADDRESS, SWAP_ABI, wallet);

      const transactionResponse = await contract.swap(
        BASE_TOKEN,
        QUOTE_TOKEN,
        POOL_INDEX,
        IS_BUY_ORDER,
        IS_BASE_QUANTITY,
        TRADE_QUANTITY,
        TRADE_TIP,
        LIMIT_ORDER_PRICE,
        MINIMUM_OUTPUT,
        RESERVE_FLAGS
      );

      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 成功将 0.001 $GOON 转换为 0.999 $goonUSD，来自 ${
          transactionResponse.from
        }！`.green
      );
      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 交易哈希: https://testnet-explorer.plumenetwork.xyz/tx/${
          transactionResponse.hash
        }`.green
      );

      success = true;
    } catch (error) {
      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] $GOON余额不足。请先从水龙头领取。错误详情: ${
          error.message
        }`.red
      );
      await delay(10000);
    }
  }
};

const performTransactions = async (count) => {
  displayHeader();
  console.log(`[${moment().format('HH:mm:ss')}] 请稍等...`.yellow);
  console.log('');

  while (count > 0) {
    await performTransaction();
    count--;

    if (count === 0) {
      console.log('');
      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 所有交易已完成。恭喜！订阅: 
          .blue
      );
    }
  }
};

(async () => {
  await performTransactions(config.transactionCount);

  if (config.autoRun) {
    const cronCommand = `node ${__filename}`;
    const cronSchedule = '0 0 * * *';
    const timeZone = 'Asia/Jakarta';

    new CronJob(
      cronSchedule,
      () => {
        execSync(cronCommand, { stdio: 'inherit' });
      },
      null,
      true,
      timeZone
    );

    console.log(
      `[${moment().format(
        'HH:mm:ss'
      )}] Cron任务已安排，每24小时在午夜（Asia/Jakarta）运行一次。`
        .yellow
    );
  }
})();
