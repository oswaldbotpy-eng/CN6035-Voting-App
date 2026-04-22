/*global AlgoSigner*/
import React, { useState, useRef, useEffect, useCallback } from "react";
import { Modal, Button, Spinner } from "react-bootstrap";
import styled from "styled-components";
import algosdk from "algosdk";
import { CONSTANTS } from "./Constants";
import MessageAlert from "./Alert";
import { useAlgo } from "../App";
 
// ── Styled Components ─────────────────────────────────────────────────────────
 
const CandidateCard = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  margin-bottom: 10px;
  border: 1.5px solid
    ${({ selected }) =>
      selected ? "var(--color-primary)" : "var(--color-border)"};
  border-radius: var(--radius);
  cursor: pointer;
  transition: all var(--transition);
  background-color: ${({ selected }) =>
    selected ? "rgba(124, 106, 255, 0.08)" : "var(--color-bg)"};
 
  &:hover {
    border-color: var(--color-primary);
    background-color: rgba(124, 106, 255, 0.05);
  }
 
  input[type="radio"] {
    accent-color: var(--color-primary);
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
`;
 
const CandidateName = styled.span`
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text);
`;
 
const CandidateIndex = styled.span`
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: var(--color-border);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
`;
 
const SubmitButton = styled(Button)`
  background-color: var(--color-primary) !important;
  border: none !important;
  border-radius: var(--radius-sm) !important;
  font-family: var(--font-display) !important;
  font-weight: 700 !important;
  padding: 10px 24px !important;
  width: 100%;
  transition: background-color var(--transition) !important;
 
  &:hover:not(:disabled) {
    background-color: var(--color-primary-hover) !important;
  }
 
  &:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }
`;
 
const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-muted);
  font-family: var(--font-display);
  font-size: 0.9rem;
`;
 
// ── Component ─────────────────────────────────────────────────────────────────
 
/**
 * CandidateModal — Vote casting interface.
 *
 * Key improvement over original:
 * Candidates are no longer hardcoded as a static array.
 * They are fetched dynamically from the election's on-chain global state,
 * filtered to exclude setup keys (RegBegin, RegEnd, VoteBegin, VoteEnd, Creator).
 *
 * This means any election created via CreateElectionModal — with any
 * candidates — will display correctly here.
 *
 * @param {boolean} show           - Modal visibility
 * @param {func}    onHide         - Close handler
 * @param {object}  election       - Election object { appId, title, candidates }
 */
export default function CandidateModal({ show, onHide, election }) {
  const { client } = useAlgo();
 
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [alert, setAlert] = useState({
    show: false,
    variant: "info",
    title: "",
    message: "",
    loading: false,
  });
 
  const userAccount = useRef(null);
 
  // Keys to exclude from global state — these are setup params not candidates
  const SETUP_KEYS = [
    btoa("RegBegin"),
    btoa("RegEnd"),
    btoa("VoteBegin"),
    btoa("VoteEnd"),
    btoa("Creator"),
  ];
 
  // ── Alert Helpers ───────────────────────────────────────────────────────────
  const showAlert = (variant, title, message, loading = false) => {
    setAlert({ show: true, variant, title, message, loading });
  };
 
  const hideAlert = () => setAlert((prev) => ({ ...prev, show: false }));
 
  // ── Fetch Candidates from Chain ─────────────────────────────────────────────
  /**
   * Reads the global state of the election contract and filters
   * out setup keys to get only candidate entries.
   *
   * This replaces the hardcoded radios array from the original.
   */
  const fetchCandidates = useCallback(async () => {
    if (!election?.appId) return;
 
    try {
      setIsLoading(true);
      const appInfo = await client.getApplicationByID(election.appId).do();
      const globalState = appInfo["params"]["global-state"];
 
      const candidateEntries = globalState
        .filter((item) => !SETUP_KEYS.includes(item.key))
        .map((item) => ({
          name: atob(item.key),
          votes: item.value.uint || 0,
        }));
 
      // If on-chain state has candidates, use those
      // Otherwise fall back to the election object's candidate list
      if (candidateEntries.length > 0) {
        setCandidates(candidateEntries);
      } else if (election.candidates) {
        setCandidates(
          election.candidates.map((name) => ({ name, votes: 0 }))
        );
      }
    } catch (err) {
      // Fallback to stored candidate list if chain read fails
      if (election?.candidates) {
        setCandidates(
          election.candidates.map((name) => ({ name, votes: 0 }))
        );
      }
      showAlert(
        "warning",
        "Using Cached Data",
        "Could not fetch live data. Showing stored candidate list."
      );
    } finally {
      setIsLoading(false);
    }
  }, [election, client]);
 
  // Fetch candidates when modal opens
  useEffect(() => {
    if (show && election?.appId) {
      fetchCandidates();
      setSelectedCandidate("");
      hideAlert();
    }
  }, [show, election]);
 
  // ── Cast Vote ───────────────────────────────────────────────────────────────
  /**
   * Builds and submits a NoOp transaction to the election contract.
   * App args: ["vote", candidateName]
   *
   * The contract checks:
   * - Voting window is open (current round within VoteBegin/VoteEnd)
   * - Sender has not already voted (local state check)
   */
  const submitVote = useCallback(async () => {
    if (!selectedCandidate) {
      showAlert("warning", "No Selection", "Please select a candidate first.");
      return;
    }
 
    try {
      setIsVoting(true);
      showAlert(
        "info",
        "Submitting Vote...",
        "Please approve the transaction in AlgoSigner.",
        true
      );
 
      // Get wallet account
      if (typeof AlgoSigner === "undefined") {
        showAlert(
          "danger",
          "AlgoSigner Not Found",
          "Please install the AlgoSigner browser extension."
        );
        return;
      }
 
      const accounts = await AlgoSigner.accounts({ ledger: "TestNet" });
      if (!accounts || accounts.length === 0) {
        showAlert("danger", "No Accounts", "No TestNet accounts found.");
        return;
      }
      userAccount.current = accounts;
      const sender = accounts[0].address;
 
      // Build NoOp transaction
      const params = await client.getTransactionParams().do();
      params.fee = 1000;
      params.flatFee = true;
 
      const appArgs = [
        new Uint8Array(Buffer.from("vote")),
        new Uint8Array(Buffer.from(selectedCandidate)),
      ];
 
      const txn = algosdk.makeApplicationNoOpTxn(
        sender,
        params,
        election.appId,
        appArgs
      );
 
      // Sign via AlgoSigner
      const txn_b64 = await AlgoSigner.encoding.msgpackToBase64(txn.toByte());
      const signedTxs = await AlgoSigner.signTxn([{ txn: txn_b64 }]);
      const binarySignedTx = await AlgoSigner.encoding.base64ToMsgpack(
        signedTxs[0].blob
      );
 
      // Submit and confirm
      const txId = await client.sendRawTransaction(binarySignedTx).do();
      await algosdk.waitForConfirmation(client, txId, 4);
 
      showAlert(
        "success",
        "Vote Cast!",
        `Your vote for "${selectedCandidate}" has been recorded on-chain.`
      );
 
      // Refresh candidate tallies after voting
      setTimeout(() => fetchCandidates(), 2000);
    } catch (err) {
      // Handle double vote — contract returns 0 for already voted
      if (err.message?.includes("rejected")) {
        showAlert(
          "danger",
          "Vote Rejected",
          "You may have already voted in this election, or the voting window is closed."
        );
      } else {
        showAlert(
          "danger",
          "Vote Failed",
          err.message || "Transaction failed."
        );
      }
    } finally {
      setIsVoting(false);
    }
  }, [selectedCandidate, election, client, fetchCandidates]);
 
  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      aria-labelledby="candidate-modal-title"
    >
      <Modal.Header closeButton>
        <Modal.Title
          id="candidate-modal-title"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          {election?.title || "Cast Your Vote"}
        </Modal.Title>
      </Modal.Header>
 
      <Modal.Body style={{ padding: "24px" }}>
        {alert.show && (
          <MessageAlert
            show={alert.show}
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            loading={alert.loading}
            close={hideAlert}
          />
        )}
 
        {isLoading ? (
          <EmptyState>
            <Spinner animation="border" size="sm" style={{ marginRight: 8 }} />
            Loading candidates from chain...
          </EmptyState>
        ) : candidates.length === 0 ? (
          <EmptyState>No candidates found for this election.</EmptyState>
        ) : (
          candidates.map((candidate, idx) => (
            <CandidateCard
              key={idx}
              selected={selectedCandidate === candidate.name ? 1 : 0}
              htmlFor={`candidate-${idx}`}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <input
                  type="radio"
                  id={`candidate-${idx}`}
                  name="candidates"
                  value={candidate.name}
                  checked={selectedCandidate === candidate.name}
                  onChange={(e) => setSelectedCandidate(e.target.value)}
                  disabled={isVoting}
                />
                <CandidateName>{candidate.name}</CandidateName>
              </div>
              <CandidateIndex>#{idx + 1}</CandidateIndex>
            </CandidateCard>
          ))
        )}
      </Modal.Body>
 
      <Modal.Footer style={{ padding: "16px 24px" }}>
        <SubmitButton
          onClick={submitVote}
          disabled={isVoting || isLoading || !selectedCandidate}
        >
          {isVoting ? "Submitting Vote..." : "Submit Vote"}
        </SubmitButton>
      </Modal.Footer>
    </Modal>
  );
}
