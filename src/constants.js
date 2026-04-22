// Central configuration for the AlgoVote DApp
export const CONSTANTS = {
  algodToken: { "X-API-Key": process.env.REACT_APP_API_KEY },
  baseServer: "https://testnet-algorand.api.purestake.io/ps2/",
  port: "",
 
  // Local storage key for persisting created elections
  ELECTIONS_STORAGE_KEY: "algovote_elections",
 
  // Link to AlgoExplorer for a given app ID
  explorerUrl: (appId) =>
    `https://testnet.algoexplorer.io/application/${appId}`,
 
  // Algorand TestNet configuration
  network: "TestNet",
 
  // Minimum ALGO balance required (in microAlgos) - for reference
  MIN_BALANCE: 100000,
};
 
// Helper to get all stored elections from localStorage
export const getStoredElections = () => {
  try {
    const stored = localStorage.getItem(CONSTANTS.ELECTIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};
 
// Helper to save a new election to localStorage
export const saveElection = (election) => {
  try {
    const existing = getStoredElections();
    const updated = [election, ...existing];
    localStorage.setItem(
      CONSTANTS.ELECTIONS_STORAGE_KEY,
      JSON.stringify(updated)
    );
    return updated;
  } catch {
    return [];
  }
};
