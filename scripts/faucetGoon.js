require('colors');
const { ethers } = require('ethers');
const { PRIVATE_KEY, provider } = require('../src/utils/config');
const { default: axios } = require('axios');
const moment = require('moment');

const { GOON_ABI } = require('../src/ABI/goonAbi');
const { displayHeader, delay } = require('../src/utils/utils');
const { PLUME_ABI } = require('../src/ABI/abi');

const IMPLEMENTATION_CA = PLUME_ABI.at(-1).IMPLEMENTATION_CA;
const PROXY_CA = PLUME_ABI.at(-1).CA;

async function getData(wallet) {
  try {
    console.log(
      `[${moment().format('HH:mm:ss')}] 请求钱包的代币水龙头数据: ${
        wallet.address
      }...`.blue
    );

    const { data } = await axios({
      url: 'https://faucet.plumenetwork.xyz/api/faucet',
      method: 'POST',
      data: {
        walletAddress: wallet.address,
        token: 'GOON',
      },
    });

    console.log(
      `[${moment().format('HH:mm:ss')}] 成功获取数据: salt = ${
        data.salt
      }, signature = ${data.signature}`.green
    );

    return { salt: data.salt, signature: data.signature, token: data.token };
  } catch (error) {
    console.error(
      `[${moment().format(
        'HH:mm:ss'
      )}] 获取代币水龙头数据时发生错误: ${error.message}`.red
    );
    throw error;
  }
}

async function claimFaucet(wallet, token, salt, signature) {
  try {
    console.log(
      `[${moment().format(
        'HH:mm:ss'
      )}] 准备使用代币: ${token}, salt: ${salt}, 和签名: ${signature} 领取水龙头...`
        .blue
    );

    const implementationContract = new ethers.Contract(
      IMPLEMENTATION_CA,
      GOON_ABI,
      wallet
    );
    const data = implementationContract.interface.encodeFunctionData(
      'getToken',
      [token, salt, signature]
    );

    const transaction = {
      to: PROXY_CA,
      data,
      from: wallet.address,
    };

    const txResponse = await wallet.sendTransaction(transaction);
    console.log(
      `[${moment().format('HH:mm:ss')}] 交易已成功发送。哈希: ${
        txResponse.hash
      }`.green
    );

    return txResponse;
  } catch (error) {
    console.error(
      `[${moment().format('HH:mm:ss')}] 领取水龙头时发生错误: ${
        error.reason || error.message
      }`.red
    );
    throw error;
  }
}

(async () => {
  displayHeader();

  while (true) {
    try {
      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 使用提供的私钥初始化钱包...`.blue
      );
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

      console.log(
        `[${moment().format('HH:mm:ss')}] 获取代币水龙头数据...`.blue
      );
      const { salt, signature, token } = await getData(wallet);

      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 尝试为钱包领取代币: ${wallet.address}...`.blue
      );
      const response = await claimFaucet(wallet, token, salt, signature);

      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 成功为钱包领取代币: ${wallet.address}`.green
      );
      console.log(
        `[${moment().format(
          'HH:mm:ss'
        )}] 交易详情: https://testnet-explorer.plumenetwork.xyz/tx/${
          response.hash
        }`.green
      );
    } catch (error) {
      console.error(
        `[${moment().format('HH:mm:ss')}] 错误: ${error.message}`.red
      );
    }
    console.log(
      `[${moment().format('HH:mm:ss')}] 10秒后重试...`.yellow
    );
    await delay(10000);
  }
})();
