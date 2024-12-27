require('colors');
const moment = require('moment');
const fs = require('fs');
const { ethers } = require('ethers');
const readlineSync = require('readline-sync');
const { CronJob } = require('cron');

const { provider } = require('../src/utils/config');
const { ARC_ABI, ARC_UTILS } = require('../src/ABI/arcAbi');
const { displayHeader } = require('../src/utils/utils');

const PROXY_CONTRACT_ADDRESS = ARC_UTILS.PROXY_CA;
const IMPLEMENTATION_CONTRACT_ADDRESS = ARC_UTILS.IMPLEMENTATION_CA;
const RWA_IMAGES = ARC_UTILS.IMAGES;

const PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));

function generateRandomString(length) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

async function createRwaToken(privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider);

  const name = generateRandomString(Math.floor(Math.random() * 6) + 5);
  const symbol = 'ITEM';
  const description = generateRandomString(Math.floor(Math.random() * 6) + 5);
  const rwaType = Math.floor(Math.random() * 10);
  const image = RWA_IMAGES[rwaType];

  const implementationContract = new ethers.Contract(
    IMPLEMENTATION_CONTRACT_ADDRESS,
    ARC_ABI,
    wallet
  );

  const data = implementationContract.interface.encodeFunctionData(
    'createToken',
    [name, symbol, description, rwaType, image]
  );

  const nonce = await provider.getTransactionCount(wallet.address);
  const feeData = await wallet.provider.getFeeData();
  const gasPrice = feeData.maxFeePerGas;

  const gasLimit = await wallet.estimateGas({
    data,
    to: PROXY_CONTRACT_ADDRESS,
  });

  const transaction = {
    to: PROXY_CONTRACT_ADDRESS,
    data,
    gasPrice,
    gasLimit,
    nonce,
    from: wallet.address,
  };

  let success = false;
  let txHash = null;

  while (!success) {
    try {
      const txResponse = await wallet.sendTransaction(transaction);
      txHash = txResponse.hash;

      await txResponse.wait();

      success = true;
    } catch (error) {
      console.error(
        `[${moment().format('HH:mm:ss')}] 发送交易时出错: ${error.message}`.red
      );
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  return { hash: txHash, from: wallet.address };
}

async function runFactoryNFT() {
  displayHeader();
  console.log('准备铸造NFTs...'.yellow);

  for (const PRIVATE_KEY of PRIVATE_KEYS) {
    try {
      const receipt = await createRwaToken(PRIVATE_KEY);
      console.log(
        `[${moment().format('HH:mm:ss')}] 成功为钱包 ${receipt.from} 铸造了NFT！ 🌟`.green
      );
      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 交易哈希: https://testnet-explorer.plumenetwork.xyz/tx/${
          receipt.hash
        }`.green
      );
      console.log('');
    } catch (error) {
      console.error(
        `[${moment().format('HH:mm:ss')}] 铸造NFT时出错: ${error.message}`.red
      );
    }
  }

  console.log('');
  console.log(
    `[${moment().format(
      'HH:mm:ss'
    )}] 所有NFT铸造交易已完成。祝贺！订阅: https://t.me/HappyCuanAirdrop`
      .blue
  );
}

const userChoice = readlineSync.question(
  '您想运行NFT铸造过程吗？\n0: 一次性运行\n1: 使用cron自动化（每24小时一次）\n选择 0 或 1: '
);

if (userChoice === '0') {
  runFactoryNFT();
} else if (userChoice === '1') {
  runFactoryNFT()
    .then(() => {
      const job = new CronJob(
        '0 0 * * *',
        runFactoryNFT,
        null,
        true,
        'Asia/Jakarta'
      );
      job.start();
      console.log(
        'Cron任务已启动！NFT铸造过程将每24小时运行一次。 🕒'.cyan
      );
    })
    .catch((error) => {
      console.log(
        `[${moment().format('HH:mm:ss')}] 设置Cron任务时出错: ${error.message}`.red
      );
    });
} else {
  console.log(
    '无效选择！请重新运行脚本并选择0或1。'.red
  );
}
