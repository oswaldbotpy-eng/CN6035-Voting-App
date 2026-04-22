import React, { useState } from "react";
import Header from "./Header";
import MainContent from "./Main";

/**
 * Home — Top-level layout component.
 *
 * Improvement over original:
 * The original Home was a pure composition wrapper with no state.
 * Now it lifts the activeElectionId state so that:
 *   - MainContent can set it when a user selects an election
 *   - Header can consume it to target the correct election on Register
 *
 * This is the standard React "lifting state up" pattern — shared state
 * lives in the closest common ancestor of the components that need it.
 */
export default function Home() {
  const [activeElectionId, setActiveElectionId] = useState(null);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      <Header activeElectionId={activeElectionId} />
      <MainContent onElectionSelect={setActiveElectionId} />
    </div>
  );
}
