const { Contract, parseEther } = require('ethers');
const fs = require('fs');
const moment = require('moment');
const readlineSync = require('readline-sync');
const { CronJob } = require('cron');

const { provider } = require('../src/utils/config');
const { STAKE_ABI, STAKE_UTILS } = require('../src/ABI/stakeAbi');
const { displayHeader } = require('../src/utils/utils');
const { createWallet } = require('../src/utils/wallet');
const { ERC20_ABI } = require('../src/ABI/ercAbi');

const IMPLEMENTATION_CA = STAKE_UTILS.implementationContractAddress;
const CA = STAKE_UTILS.contractAddress;
const GOON_CA = STAKE_UTILS.goonCA;

const PRIVATE_KEYS = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));

async function doStake(privateKey) {
  const retryDelay = 5000;

  while (true) {
    try {
      const wallet = createWallet(privateKey, provider);
      const implementationContract = new Contract(
        IMPLEMENTATION_CA,
        STAKE_ABI,
        wallet
      );

      const goonContract = new Contract(GOON_CA, ERC20_ABI, wallet);
      await goonContract.approve(CA, parseEther('1'));

      const data = implementationContract.interface.encodeFunctionData(
        'stake',
        [parseEther('0.1')]
      );

      const feeData = await wallet.provider.getFeeData();
      const gasPrice = feeData.gasPrice;

      const gasLimit = await wallet.estimateGas({
        data,
        to: CA,
      });

      const transaction = {
        to: CA,
        data,
        gasLimit,
        gasPrice,
        from: wallet.address,
      };

      const txHash = await wallet.sendTransaction(transaction);
      return txHash;
    } catch (error) {
      console.log(
        `[${moment().format('HH:mm:ss')}] 执行交易时出错: ${
          error.message
        }`.red
      );
      console.log(
        `[${moment().format('HH:mm:ss')}] ${retryDelay / 1000} 秒后重试交易...`.yellow
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

async function runStakeGoon() {
  displayHeader();
  console.log('准备质押...'.yellow);

  for (const PRIVATE_KEY of PRIVATE_KEYS) {
    try {
      const receipt = await doStake(PRIVATE_KEY);
      if (receipt.from) {
        console.log(
          `[${moment().format(
            'HH:mm:ss'
          )}] 成功为钱包 ${receipt.from} 质押了 0.1 $GOONUSD！ 🌟`
            .green
        );
        console.log(
          `[${moment().format(
            'HH:mm:ss'
          )}] 交易哈希: https://testnet-explorer.plumenetwork.xyz/tx/${
            receipt.hash
          }`.green
        );
        console.log('');
      }
    } catch (error) {
      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 处理交易时出错。请稍后再试。`.red
      );
    }
  }

  console.log(
    `[${moment().format(
      'HH:mm:ss'
    )}] 所有质押交易已完成。祝贺！`
      .blue
  );
}

const userChoice = readlineSync.question(
  '您想运行质押过程吗？\n0: 一次性运行\n1: 使用cron自动化（每24小时一次）\n选择 0 或 1: '
);

if (userChoice === '0') {
  runStakeGoon();
} else if (userChoice === '1') {
  runStakeGoon()
    .then(() => {
      const job = new CronJob(
        '0 0 * * *',
        runStakeGoon,
        null,
        true,
        'Asia/Jakarta'
      );
      job.start();
      console.log(
        'Cron任务已启动！质押过程将每24小时运行一次。 🕒'.cyan
      );
    })
    .catch((error) => {
      console.log(
        `[${moment().format('HH:mm:ss')}] 设置Cron任务时出错: ${
          error.message
        }`.red
      );
    });
} else {
  console.log(
    '无效选择！请重新运行脚本并选择0或1。'.red
  );
}
