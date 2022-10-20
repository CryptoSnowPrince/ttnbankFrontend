import dotenv from "dotenv";
import WalletConnectProvider from "@walletconnect/web3-provider";
import Web3Modal from "web3modal";

dotenv.config();

/**
  Web3 modal helps us "connect" external wallets:
**/
const web3ModalSetup = () =>
  new Web3Modal({
    cacheProvider: true,
    providerOptions: {
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          infuraId: process.env.REACT_APP_INFURA_ID, // required
          rpc: {
            97: "https://data-seed-prebsc-1-s1.binance.org:8545/", // bsctestnet
            //  56: "https://bsc-dataseed.binance.org",
            //4002: "https://rpc.testnet.fantom.network/",
          },
        },
      },
    },
  });

export default web3ModalSetup;
