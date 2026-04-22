import React, { useState, useEffect, useCallback } from "react";
import { Button, Container, Row, Col, Spinner } from "react-bootstrap";
import styled from "styled-components";
import algosdk from "algosdk";
import { CONSTANTS, getStoredElections } from "./Constants";
import CandidateModal from "./CandidateModal";
import ResultModal from "./ResultModal";
import CreateElectionModal from "./CreateElectionModal";
import { useAlgo } from "../App";
 
// ── Styled Components ─────────────────────────────────────────────────────────
 
const HeroSection = styled.section`
  padding: 80px 0 60px;
  position: relative;
  overflow: hidden;
 
  &::before {
    content: "";
    position: absolute;
    top: -100px;
    right: -100px;
    width: 400px;
    height: 400px;
    background: radial-gradient(
      circle,
      rgba(124, 106, 255, 0.12) 0%,
      transparent 70%
    );
    pointer-events: none;
  }
`;
 
const HeroTitle = styled.h1`
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  line-height: 1.05;
  letter-spacing: -2px;
  color: var(--color-text);
  margin-bottom: 20px;
 
  span {
    color: var(--color-primary);
  }
`;
 
const HeroSubtext = styled.p`
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--color-text-muted);
  max-width: 480px;
  line-height: 1.6;
  margin-bottom: 32px;
`;
 
const HeroActions = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;
 
const PrimaryButton = styled(Button)`
  background-color: var(--color-primary) !important;
  border: none !important;
  border-radius: var(--radius-sm) !important;
  font-family: var(--font-display) !important;
  font-weight: 700 !important;
  font-size: 0.95rem !important;
  padding: 12px 28px !important;
  transition: background-color var(--transition) !important;
 
  &:hover {
    background-color: var(--color-primary-hover) !important;
  }
`;
 
const SecondaryButton = styled(Button)`
  background-color: transparent !important;
  border: 1px solid var(--color-border) !important;
  color: var(--color-text) !important;
  border-radius: var(--radius-sm) !important;
  font-family: var(--font-display) !important;
  font-weight: 600 !important;
  font-size: 0.95rem !important;
  padding: 12px 28px !important;
  transition: all var(--transition) !important;
 
  &:hover {
    border-color: var(--color-primary) !important;
    color: var(--color-primary) !important;
  }
`;
 
const SectionDivider = styled.div`
  border-top: 1px solid var(--color-border);
  margin: 40px 0;
`;
 
const SectionTitle = styled.h2`
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--color-text);
  margin-bottom: 20px;
`;
 
const ElectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 40px;
`;
 
const ElectionCard = styled.div`
  background: var(--color-surface);
  border: 1.5px solid
    ${({ active }) => (active ? "var(--color-primary)" : "var(--color-border)")};
  border-radius: var(--radius);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
 
  &:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(124, 106, 255, 0.12);
  }
 
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ active }) =>
      active ? "var(--color-primary)" : "transparent"};
    transition: background var(--transition);
  }
`;
 
const ElectionTitle = styled.h3`
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text);
  margin-bottom: 8px;
`;
 
const ElectionMeta = styled.p`
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-text-muted);
  margin: 0 0 4px;
`;
 
const StatusBadge = styled.span`
  display: inline-block;
  font-family: var(--font-display);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  margin-top: 10px;
  background: ${({ status }) => {
    if (status === "voting") return "rgba(61, 255, 176, 0.15)";
    if (status === "registration") return "rgba(255, 122, 61, 0.15)";
    return "rgba(110, 110, 138, 0.15)";
  }};
  color: ${({ status }) => {
    if (status === "voting") return "var(--color-success)";
    if (status === "registration") return "var(--color-accent)";
    return "var(--color-text-muted)";
  }};
`;
 
const CardActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
`;
 
const CardButton = styled.button`
  flex: 1;
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-family: var(--font-display);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
 
  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }
`;
 
const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-muted);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius);
`;
 
const EmptyStateTitle = styled.h3`
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--color-text-muted);
  margin-bottom: 8px;
`;
 
const HowToStep = styled.div`
  text-align: center;
  padding: 24px 16px;
`;
 
const StepIcon = styled.div`
  font-size: 2rem;
  margin-bottom: 12px;
`;
 
const StepTitle = styled.h5`
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 4px;
`;
 
const StepDesc = styled.p`
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: 0;
`;
 
// ── Helpers ───────────────────────────────────────────────────────────────────
 
/**
 * Determines the current status of an election based on round windows.
 * @param {object} election
 * @param {number} currentRound
 * @returns {"registration"|"voting"|"closed"|"pending"}
 */
const getElectionStatus = (election, currentRound) => {
  if (!currentRound) return "pending";
  const { regBegin, regEnd, voteBegin, voteEnd } = election;
  if (currentRound >= voteBegin && currentRound <= voteEnd) return "voting";
  if (currentRound >= regBegin && currentRound <= regEnd) return "registration";
  if (currentRound > voteEnd) return "closed";
  return "pending";
};
 
const STATUS_LABELS = {
  voting: "Voting Open",
  registration: "Registration Open",
  closed: "Closed",
  pending: "Upcoming",
};
 
// ── Component ─────────────────────────────────────────────────────────────────
 
/**
 * MainContent — Election dashboard and landing page.
 *
 * Key improvements over original:
 * - Elections loaded from localStorage (persisted across sessions)
 * - Election cards show status (Voting Open, Registration, Closed)
 * - Active election selection drives Header registration
 * - CreateElectionModal integrated for dynamic election creation
 * - Global state read on demand per election
 * - Winner calculation done in ResultModal via useMemo (not here)
 * - No side effects in render
 *
 * @param {func} onElectionSelect - Notifies parent (Home) of active election ID
 */
export default function MainContent({ onElectionSelect }) {
  const { client } = useAlgo();
 
  const [elections, setElections] = useState([]);
  const [activeElection, setActiveElection] = useState(null);
  const [currentRound, setCurrentRound] = useState(null);
  const [resultData, setResultData] = useState([]);
  const [resultLoading, setResultLoading] = useState(false);
 
  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [showCandidate, setShowCandidate] = useState(false);
  const [showResult, setShowResult] = useState(false);
 
  // Keys to exclude from results
  const SETUP_KEYS = [
    btoa("RegBegin"),
    btoa("RegEnd"),
    btoa("VoteBegin"),
    btoa("VoteEnd"),
    btoa("Creator"),
  ];
 
  // ── Load Elections & Current Round ─────────────────────────────────────────
  useEffect(() => {
    const stored = getStoredElections();
    setElections(stored);
 
    // Fetch current round for status badges
    const fetchRound = async () => {
      try {
        const status = await client.status().do();
        setCurrentRound(status["last-round"]);
      } catch {
        // Non-critical — status badges just show "pending"
      }
    };
    fetchRound();
  }, [client]);
 
  // ── Select Election ────────────────────────────────────────────────────────
  const selectElection = useCallback(
    (election) => {
      setActiveElection(election);
      onElectionSelect(election.appId);
    },
    [onElectionSelect]
  );
 
  // ── Handle New Election Created ────────────────────────────────────────────
  const handleElectionCreated = useCallback((electionData) => {
    setElections((prev) => [electionData, ...prev]);
    setActiveElection(electionData);
  }, []);
 
  // ── Fetch Results ──────────────────────────────────────────────────────────
  const fetchResults = useCallback(
    async (election) => {
      try {
        setResultLoading(true);
        setResultData([]);
        setShowResult(true);
 
        const appInfo = await client.getApplicationByID(election.appId).do();
        const globalState = appInfo["params"]["global-state"];
 
        const candidates = globalState.filter(
          (item) => !SETUP_KEYS.includes(item.key)
        );
        setResultData(candidates);
      } catch (err) {
        setResultData([]);
      } finally {
        setResultLoading(false);
      }
    },
    [client]
  );
 
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Hero ── */}
      <HeroSection>
        <Container>
          <Row className="align-items-center">
            <Col lg={7}>
              <HeroTitle>
                Vote on the <span>blockchain.</span>
                <br />
                Transparent by design.
              </HeroTitle>
              <HeroSubtext>
                Create elections, register voters, and cast votes — all recorded
                permanently on the Algorand TestNet. No servers. No middlemen.
              </HeroSubtext>
              <HeroActions>
                <PrimaryButton onClick={() => setShowCreate(true)}>
                  Create Election
                </PrimaryButton>
                <SecondaryButton
                  onClick={() => {
                    if (activeElection) fetchResults(activeElection);
                  }}
                  disabled={!activeElection}
                >
                  View Results
                </SecondaryButton>
              </HeroActions>
            </Col>
          </Row>
        </Container>
      </HeroSection>
 
      <Container>
        {/* ── Elections Dashboard ── */}
        <SectionDivider />
        <SectionTitle>
          {elections.length > 0 ? "Active Elections" : "No Elections Yet"}
        </SectionTitle>
 
        {elections.length === 0 ? (
          <EmptyState>
            <EmptyStateTitle>No elections have been created yet</EmptyStateTitle>
            <p style={{ fontSize: "0.85rem", marginBottom: 20 }}>
              Create the first one to get started.
            </p>
            <PrimaryButton onClick={() => setShowCreate(true)}>
              Create Election
            </PrimaryButton>
          </EmptyState>
        ) : (
          <ElectionGrid>
            {elections.map((election, idx) => {
              const status = getElectionStatus(election, currentRound);
              const isActive = activeElection?.appId === election.appId;
 
              return (
                <ElectionCard
                  key={idx}
                  active={isActive ? 1 : 0}
                  onClick={() => selectElection(election)}
                >
                  <ElectionTitle>{election.title}</ElectionTitle>
                  <ElectionMeta>
                    App ID: {election.appId}
                  </ElectionMeta>
                  <ElectionMeta>
                    {election.candidates?.length || 0} candidates
                  </ElectionMeta>
                  <ElectionMeta>
                    Creator:{" "}
                    {election.creator
                      ? `${election.creator.slice(0, 6)}...${election.creator.slice(-4)}`
                      : "Unknown"}
                  </ElectionMeta>
                  <StatusBadge status={status}>
                    {STATUS_LABELS[status]}
                  </StatusBadge>
 
                  <CardActions>
                    <CardButton
                      onClick={(e) => {
                        e.stopPropagation();
                        selectElection(election);
                        setShowCandidate(true);
                      }}
                    >
                      Vote
                    </CardButton>
                    <CardButton
                      onClick={(e) => {
                        e.stopPropagation();
                        selectElection(election);
                        fetchResults(election);
                      }}
                    >
                      Results
                    </CardButton>
                  </CardActions>
                </ElectionCard>
              );
            })}
          </ElectionGrid>
        )}
 
        {/* ── How To Vote ── */}
        <SectionDivider />
        <SectionTitle>How it works</SectionTitle>
        <Row className="justify-content-center mb-5">
          {[
            {
              icon: "🦊",
              title: "Connect Wallet",
              desc: "Install AlgoSigner and connect your TestNet account",
            },
            {
              icon: "🗳️",
              title: "Create or Join",
              desc: "Create a new election or select an existing one",
            },
            {
              icon: "✍️",
              title: "Register",
              desc: "Opt-in to the election during the registration window",
            },
            {
              icon: "📊",
              title: "Vote & Verify",
              desc: "Cast your vote and verify results on AlgoExplorer",
            },
          ].map((step, idx) => (
            <Col key={idx} md={3} sm={6}>
              <HowToStep>
                <StepIcon>{step.icon}</StepIcon>
                <StepTitle>{step.title}</StepTitle>
                <StepDesc>{step.desc}</StepDesc>
              </HowToStep>
            </Col>
          ))}
        </Row>
      </Container>
 
      {/* ── Modals ── */}
      <CreateElectionModal
        show={showCreate}
        onHide={() => setShowCreate(false)}
        onElectionCreated={handleElectionCreated}
      />
 
      <CandidateModal
        show={showCandidate}
        onHide={() => setShowCandidate(false)}
        election={activeElection}
      />
 
      <ResultModal
        show={showResult}
        onHide={() => setShowResult(false)}
        data={resultData}
        loading={resultLoading}
        election={activeElection}
      />
    </>
  );
}
 
