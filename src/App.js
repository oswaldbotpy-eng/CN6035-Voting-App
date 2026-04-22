import React, { createContext, useContext, useMemo } from "react";
import algosdk from "algosdk";
import { CONSTANTS } from "./components/Constants";
import Home from "./components/Home";

/**
 * AlgoContext — shared Algorand client context.
 *
 * One of the key improvements over the original codebase:
 * the original instantiated a new algosdk.Algodv2 client inside
 * every component (Header, Main, CandidateModal) on every render.
 *
 * This context creates a single shared client instance at the app root,
 * following the pattern taught in the CN6035 Week 7 practical (config.ts).
 * All child components consume it via useAlgo() instead of re-creating it.
 */
export const AlgoContext = createContext(null);

export const useAlgo = () => {
  const context = useContext(AlgoContext);
  if (!context) {
    throw new Error("useAlgo must be used within AlgoContext.Provider");
  }
  return context;
};

function App() {
  // useMemo ensures the client is only created once, not on every render
  const client = useMemo(
    () =>
      new algosdk.Algodv2(
        CONSTANTS.algodToken,
        CONSTANTS.baseServer,
        CONSTANTS.port
      ),
    []
  );

  return (
    <AlgoContext.Provider value={{ client }}>
      <Home />
    </AlgoContext.Provider>
  );
}

export default App;
