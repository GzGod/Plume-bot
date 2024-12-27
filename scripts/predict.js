const readlineSync = require('readline-sync');
const colors = require('colors');
const { ethers } = require('ethers');
const moment = require('moment');
const fs = require('fs');
const cron = require('cron');

const { provider } = require('../src/utils/config');
const { PREDICT_ABI } = require('../src/ABI/predictAbi');
const { PREDICT_PAIR, PREDICT_CONTRACT } = require('../src/utils/pairIndex');
const { displayHeader, filterPairsByType } = require('../src/utils/utils');

const IMPLEMENTATION_CA = PREDICT_CONTRACT.implementation;
const PARENT_CA = PREDICT_CONTRACT.proxy;

const privateKeys = JSON.parse(fs.readFileSync('privateKeys.json', 'utf-8'));

const runPredictionForAllWallets = async (selectedPair, isLong) => {
  for (const privateKey of privateKeys) {
    try {
      const wallet = new ethers.Wallet(privateKey, provider);
      const implementationCa = new ethers.Contract(
        IMPLEMENTATION_CA,
        PREDICT_ABI,
        wallet
      );

      const data = implementationCa.interface.encodeFunctionData(
        'predictPriceMovement',
        [selectedPair.index.toString(), isLong]
      );

      const transaction = {
        to: PARENT_CA,
        data,
        from: wallet.address,
      };

      console.log(
        colors.yellow(`从钱包发送交易: ${wallet.address}...`)
      );
      const txResponse = await wallet.sendTransaction(transaction);
      await txResponse.wait();

      console.log(
        colors.green(
          `[${moment().format(
            'HH:mm:ss'
          )}] 交易成功来自钱包: ${wallet.address}`
        )
      );
      console.log(
        colors.magenta(
          `[${moment().format(
            'HH:mm:ss'
          )}] 交易哈希: https://testnet-explorer.plumenetwork.xyz/tx/${
            txResponse.hash
          }`
        )
      );
    } catch (error) {
      if (error.message.includes('Wait for cooldown')) {
        console.log(
          colors.red(
            `[${moment().format(
              'HH:mm:ss'
            )}] 您已经预测过，请等待冷却期（1小时）。`
          )
        );
      } else if (error.message.includes('Pair has not started yet')) {
        console.log(
          colors.red(
            `[${moment().format(
              'HH:mm:ss'
            )}] 该交易对尚未启动，请尝试其他交易对。`
          )
        );
      } else {
        console.log(
          colors.red(
            `[${moment().format(
              'HH:mm:ss'
            )}] 钱包 ${privateKey} 发生错误: ${error.message}`
          )
        );
      }
    }
  }
};

const predictForAllPairs = async (type, isLong) => {
  const availablePairs = filterPairsByType(type, PREDICT_PAIR);

  for (const pair of availablePairs) {
    console.log(
      colors.green(
        `[${moment().format('HH:mm:ss')}] 预测交易对: ${pair.name} (${
          pair.symbol
        })`
      )
    );
    await runPredictionForAllWallets(pair, isLong);
  }
};

const main = async () => {
  displayHeader();
  console.log(`请稍等...`.yellow);
  console.log('');

  try {
    const predictionType = readlineSync.question(
      colors.yellow(
        '您想预测什么？\n1. 加密货币\n2. 外汇\n请选择（1或2）： '
      )
    );

    const type = predictionType === '1' ? 'crypto' : 'forex';

    const choice = readlineSync.question(
      colors.yellow(
        '您想预测:\n1. 单一特定交易对\n2. 所有可用交易对\n请选择（1或2）： '
      )
    );

    if (choice === '1') {
      const availablePairs = filterPairsByType(type, PREDICT_PAIR);
      const pairNames = availablePairs.map(
        (pair, index) => `${index + 1}. ${pair.name} (${pair.symbol})`
      );
      const pairIndex = readlineSync.keyInSelect(
        pairNames,
        colors.cyan('选择交易对: ')
      );

      if (pairIndex === -1) {
        console.log(
          colors.red(
            `[${moment().format('HH:mm:ss')}] 未选择交易对。退出...`
          )
        );
        return;
      }

      const selectedPair = availablePairs[pairIndex];
      console.log(
        colors.green(
          `[${moment().format('HH:mm:ss')}] 您选择了: ${
            selectedPair.name
          } (${selectedPair.symbol})`
        )
      );

      let longOrShort;
      while (!longOrShort) {
        const input = readlineSync
          .question(
            colors.yellow(
              '您想做多还是做空？（输入 "long" 或 "short"）： '
            )
          )
          .toLowerCase();

        if (input === 'long' || input === 'short') {
          longOrShort = input;
        } else {
          console.log(
            colors.red('无效输入，请输入 "long" 或 "short"。')
          );
        }
      }
      const isLong = longOrShort === 'long';

      const runEveryHour = readlineSync.keyInYN(
        colors.yellow('您希望每小时运行一次此预测吗？')
      );

      if (runEveryHour) {
        await runPredictionForAllWallets(selectedPair, isLong);
        console.log('');

        const job = new cron.CronJob('0 * * * *', () => {
          runPredictionForAllWallets(selectedPair, isLong);
        });
        job.start();
        console.log(
          colors.green(
            `[${moment().format(
              'HH:mm:ss'
            )}] Cron任务已启动：预测将每小时运行一次。`
          )
        );
      } else {
        await runPredictionForAllWallets(selectedPair, isLong);
      }
    } else if (choice === '2') {
      let longOrShort;
      while (!longOrShort) {
        const input = readlineSync
          .question(
            colors.yellow(
              '您想做多还是做空？（输入 "long" 或 "short"）： '
            )
          )
          .toLowerCase();

        if (input === 'long' || input === 'short') {
          longOrShort = input;
        } else {
          console.log(
            colors.red('无效输入，请输入 "long" 或 "short"。')
          );
        }
      }
      const isLong = longOrShort === 'long';

      const runEveryHour = readlineSync.keyInYN(
        colors.yellow(
          '您希望每小时为所有交易对运行预测吗？'
        )
      );

      if (runEveryHour) {
        await predictForAllPairs(type, isLong);

        const job = new cron.CronJob('0 * * * *', () => {
          predictForAllPairs(type, isLong);
        });
        job.start();
        console.log(
          colors.green(
            `[${moment().format(
              'HH:mm:ss'
            )}] Cron任务已启动：所有交易对的预测将每小时运行一次。`
          )
        );
      } else {
        await predictForAllPairs(type, isLong);
      }
    } else {
      console.log(colors.red('选择无效，退出...'));
    }
  } catch (error) {
    console.log(
      colors.red(`[${moment().format('HH:mm:ss')}] 错误: ${error.message}`)
    );
  } finally {
    console.log('');
    console.log(
      colors.green(`[${moment().format('HH:mm:ss')}] 所有任务完成！`)
    );
    console.log(
      colors.green(
        `[${moment().format(
          'HH:mm:ss'
        )}] 订阅: https://t.me/HappyCuanAirdrop`
      )
    );
  }
};

main();
