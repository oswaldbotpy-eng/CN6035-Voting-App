export const CONSTANTS = {
  // Algod connection
  algodToken: {
    "X-API-Key": process.env.REACT_APP_API_KEY,
  },

  baseServer: process.env.REACT_APP_ALGOD_SERVER || "https://testnet-algorand.api.purestake.io/ps2/",
  port: "",

  // App configuration
  APP_ID: process.env.REACT_APP_APP_ID || 76971672,

  // Explorer
  explorer: (appId) => `https://testnet.algoexplorer.io/application/${appId}`,
};
