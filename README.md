# Plume Network Testnet bot
Bot to interact with Plume Network Testnet faucets and manage transactions automatically.

## Features

- Claim ETH and GOON tokens from the Plume testnet faucet.
- Automatically handles transactions and errors.
- Provides real-time feedback and transaction details.
- Includes a daily check-in, auto mint NFT, auto stake, and auto swap feature for automated processes.

## Requirements

- Node.js
- `npm` or `yarn` for package management
- `.env` file for storing sensitive information
- `privateKeys.json` for daily check-ins

## Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/frankrichardhall/PlumeNetwork-Testnet-bot.git
    ```

2. Navigate into the project directory:

    ```bash
    cd PlumeNetwork-Testnet-bot
    ```

3. Install dependencies:

    ```bash
    npm install
    ```

4. Create a `privateKeys.json` file in the root directory of the project. Add your private keys in the following format:

    ```json
    ["pk1", "pk2", "pk3"]
    ```

## Usage

### Running the Menu

1. Run the menu to choose which script to execute:

    ```bash
    node index.js
    ```

2. The menu will prompt you to select a script to run. Choose the desired option and follow the instructions to run the corresponding npm script.

## Contributing

Feel free to open issues or submit pull requests if you have improvements or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
