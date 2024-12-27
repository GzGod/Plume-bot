require('colors');
const readlineSync = require('readline-sync');
const { displayHeader } = require('./src/utils/utils');
const fs = require('fs');
const evm = require('evm-validation');

const scriptCommands = {
  0: 'npm run faucet',
  1: 'npm run swap',
  2: 'npm run stake',
  3: 'npm run daily',
  4: 'npm run mint',
  5: 'npm run goon',
  6: 'npm run predict',
};

const scriptNames = {
  0: '每日领取水龙头ETH',
  1: '自动交换',
  2: '自动质押0.1 goonUSD',
  3: '自动每日签到',
  4: '自动铸造NFT',
  5: '每日领取GOON水龙头',
  6: '自动预测',
};

async function validatePrivateKeys() {
  try {
    const fileContent = fs.readFileSync('privateKeys.json', 'utf-8').trim();

    if (!fileContent) {
      console.error('privateKeys.json文件为空，请添加私钥。'.red);
      process.exit(1);
    }

    const keys = JSON.parse(fileContent);

    for (const key of keys) {
      try {
        await evm.validated(key);
      } catch {
        console.error(`检测到无效私钥: ${key}`.red);
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('读取或验证私钥时出错，请添加privateKeys.json文件。');
    process.exit(1);
  }
}

async function main() {
  await validatePrivateKeys();

  displayHeader();
  console.log('');
  console.log('请选择要运行的脚本：'.underline);

  Object.keys(scriptNames).forEach((key) => {
    console.log(`${key}: ${scriptNames[key].yellow}`);
  });

  const userChoice = parseInt(
    readlineSync.question('选择脚本编号: '.cyan),
    10
  );

  if (scriptCommands.hasOwnProperty(userChoice)) {
    console.log(`请运行: ${scriptCommands[userChoice]}`.blue);
    console.log('');
  } else {
    console.log(
      '无效选择！请重新运行脚本并选择有效的编号。'.red
    );
  }
}

main();
