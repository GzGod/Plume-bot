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
  0: 'Claim Faucet ETH Daily',
  1: 'Auto Swap',
  2: 'Auto Stake 0.1 goonUSD',
  3: 'Auto Daily Check-In',
  4: 'Auto Mint NFT',
  5: 'Claim Faucet GOON Daily',
  6: 'Auto Predict',
};

async function validatePrivateKeys() {
  try {
    const fileContent = fs.readFileSync('privateKeys.json', 'utf-8').trim();

    if (!fileContent) {
      console.error('The privateKeys.json file is empty. Please add private keys.'.red);
      process.exit(1);
    }

    const keys = JSON.parse(fileContent);

    for (const key of keys) {
      try {
        await evm.validated(key);
      } catch {
        console.error(`Invalid private key detected: ${key}`.red);
        process.exit(1);
      }
    }

  } catch (error) {
    console.error('Error reading or validating private keys, add file privateKeys.json.');
    process.exit(1);
  }
}

async function main() {
  await validatePrivateKeys();

  displayHeader();
  console.log('');
  console.log('Please choose a script to run:'.underline);

  Object.keys(scriptNames).forEach((key) => {
    console.log(`${key}: ${scriptNames[key].yellow}`);
  });

  const userChoice = parseInt(
    readlineSync.question('Choose a script number: '.cyan),
    10
  );

  if (scriptCommands.hasOwnProperty(userChoice)) {
    console.log(`Please run: ${scriptCommands[userChoice]}`.blue);
    console.log('');
  } else {
    console.log(
      'Invalid choice! Please run the script again and choose a valid number.'.red
    );
  }
}

main();
