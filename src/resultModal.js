import React, { useMemo } from "react";
import { Modal, Table } from "react-bootstrap";
import styled from "styled-components";
import { CONSTANTS } from "./Constants";

// ── Styled Components ─────────────────────────────────────────────────────────

const WinnerBanner = styled.div`
  background: linear-gradient(
    135deg,
    rgba(61, 255, 176, 0.1),
    rgba(124, 106, 255, 0.1)
  );
  border: 1px solid rgba(61, 255, 176, 0.3);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Trophy = styled.span`
  font-size: 2rem;
`;

const WinnerName = styled.h3`
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.3rem;
  color: var(--color-success);
  margin: 0;
`;

const WinnerVotes = styled.p`
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin: 4px 0 0;
`;

const BarContainer = styled.div`
  margin-bottom: 14px;
`;

const BarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--color-text);
`;

const BarTrack = styled.div`
  background: var(--color-border);
  border-radius: 4px;
  height: 10px;
  overflow: hidden;
`;

const BarFill = styled.div`
  height: 100%;
  border-radius: 4px;
  background: ${({ winner }) =>
    winner
      ? "linear-gradient(90deg, var(--color-success), var(--color-primary))"
      : "var(--color-primary)"};
  width: ${({ pct }) => pct}%;
  transition: width 0.6s ease;
  opacity: ${({ winner }) => (winner ? 1 : 0.6)};
`;

const StatsRow = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 24px;
`;

const StatCard = styled.div`
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
`;

const StatValue = styled.p`
  font-family: var(--font-mono);
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--color-primary);
  margin: 0;
`;

const StatLabel = styled.p`
  font-family: var(--font-display);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 4px 0 0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ExplorerLink = styled.a`
  display: block;
  text-align: center;
  margin-top: 20px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-primary);
  text-decoration: none;
  opacity: 0.8;
  transition: opacity var(--transition);

  &:hover {
    opacity: 1;
    text-decoration: underline;
    color: var(--color-primary);
  }
`;

const SectionLabel = styled.p`
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 12px;
  margin-top: 20px;
`;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ResultModal — Live election results display.
 *
 * Key improvements over original:
 * - Winner calculation moved out of render (was a side effect in JSX map)
 * - useMemo for derived values — totalVotes, winner, percentages
 * - Visual bar chart of vote distribution
 * - Winner banner with trophy
 * - Stats cards (total votes, candidate count, winner share)
 * - AlgoExplorer link is now dynamic per election
 * - No more side-effect mutations inside render (myList.push in original)
 *
 * @param {boolean} show      - Modal visibility
 * @param {func}    onHide    - Close handler
 * @param {Array}   data      - Array of { key, value: { uint } } from global state
 * @param {string}  loading   - Loading message string
 * @param {object}  election  - Election metadata { title, appId }
 */
export default function ResultModal({ show, onHide, data, loading, election }) {

  // ── Derived State (fixes render-phase side effects from original) ───────────
  const results = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .map((item) => ({
        name: atob(item.key),
        votes: item.value?.uint || 0,
      }))
      .sort((a, b) => b.votes - a.votes); // Sort by votes descending
  }, [data]);

  const totalVotes = useMemo(
    () => results.reduce((sum, r) => sum + r.votes, 0),
    [results]
  );

  const winner = useMemo(
    () => (results.length > 0 ? results[0] : null),
    [results]
  );

  const getPercentage = (votes) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      aria-labelledby="result-modal-title"
    >
      <Modal.Header closeButton>
        <Modal.Title
          id="result-modal-title"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          {election?.title ? `Results: ${election.title}` : "Election Results"}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "24px" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-display)",
            }}
          >
            <div className="spinner-border spinner-border-sm me-2" />
            Loading results from chain...
          </div>
        ) : results.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-display)",
            }}
          >
            No votes have been cast yet.
          </div>
        ) : (
          <>
            {/* Winner Banner */}
            {winner && totalVotes > 0 && (
              <WinnerBanner>
                <Trophy>🏆</Trophy>
                <div>
                  <WinnerName>{winner.name}</WinnerName>
                  <WinnerVotes>
                    {winner.votes} votes · {getPercentage(winner.votes)}% of
                    total
                  </WinnerVotes>
                </div>
              </WinnerBanner>
            )}

            {/* Bar Chart */}
            <SectionLabel>Vote Distribution</SectionLabel>
            {results.map((candidate, idx) => (
              <BarContainer key={idx}>
                <BarLabel>
                  <span>{candidate.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)" }}>
                    {candidate.votes} ({getPercentage(candidate.votes)}%)
                  </span>
                </BarLabel>
                <BarTrack>
                  <BarFill
                    pct={getPercentage(candidate.votes)}
                    winner={idx === 0 ? 1 : 0}
                  />
                </BarTrack>
              </BarContainer>
            ))}

            {/* Stats Cards */}
            <StatsRow>
              <StatCard>
                <StatValue>{totalVotes}</StatValue>
                <StatLabel>Total Votes</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{results.length}</StatValue>
                <StatLabel>Candidates</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>
                  {winner ? `${getPercentage(winner.votes)}%` : "—"}
                </StatValue>
                <StatLabel>Winner Share</StatLabel>
              </StatCard>
            </StatsRow>

            {/* Full Table */}
            <SectionLabel style={{ marginTop: 24 }}>Full Results</SectionLabel>
            <Table
              striped
              bordered
              hover
              style={{ fontFamily: "var(--font-display)" }}
            >
              <thead>
                <tr>
                  <th style={{ color: "var(--color-text-muted)" }}>#</th>
                  <th style={{ color: "var(--color-text-muted)" }}>
                    Candidate
                  </th>
                  <th style={{ color: "var(--color-text-muted)" }}>Votes</th>
                  <th style={{ color: "var(--color-text-muted)" }}>Share</th>
                </tr>
              </thead>
              <tbody>
                {results.map((candidate, idx) => (
                  <tr key={idx}>
                    <td style={{ color: "var(--color-text-muted)" }}>
                      {idx + 1}
                    </td>
                    <td>
                      {idx === 0 && totalVotes > 0 && (
                        <span style={{ marginRight: 6 }}>🏆</span>
                      )}
                      {candidate.name}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {candidate.votes}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>
                      {getPercentage(candidate.votes)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {/* AlgoExplorer Link */}
            {election?.appId && (
              <ExplorerLink
                href={CONSTANTS.explorerUrl(election.appId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on AlgoExplorer →
              </ExplorerLink>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
