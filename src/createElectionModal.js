/*global AlgoSigner*/
import React, { useState, useRef, useCallback } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import styled from "styled-components";
import algosdk from "algosdk";
import { CONSTANTS, saveElection } from "./Constants";
import MessageAlert from "./Alert";
import { useAlgo } from "../App";

// ── Styled Components ─────────────────────────────────────────────────────────

const StyledModal = styled(Modal)`
  .modal-content {
    background-color: var(--color-surface) !important;
    border: 1px solid var(--color-border) !important;
    border-radius: var(--radius) !important;
    color: var(--color-text) !important;
  }
`;

const SectionLabel = styled.p`
  font-family: var(--font-display);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 10px;
  margin-top: 20px;
`;

const StyledInput = styled(Form.Control)`
  background-color: var(--color-bg) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: var(--radius-sm) !important;
  color: var(--color-text) !important;
  font-family: var(--font-display) !important;
  font-size: 0.9rem !important;
  padding: 10px 14px !important;
  transition: border-color var(--transition) !important;

  &:focus {
    border-color: var(--color-primary) !important;
    box-shadow: 0 0 0 3px rgba(124, 106, 255, 0.15) !important;
    outline: none !important;
  }

  &::placeholder {
    color: var(--color-text-muted) !important;
    opacity: 0.6 !important;
  }
`;

const CandidateRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;

  input {
    flex: 1;
  }
`;

const RemoveButton = styled.button`
  background: none;
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  border-radius: var(--radius-sm);
  padding: 6px 10px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;

  &:hover {
    background-color: var(--color-danger);
    color: white;
  }
`;

const AddCandidateButton = styled.button`
  background: none;
  border: 1px dashed var(--color-primary);
  color: var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: all var(--transition);
  margin-top: 4px;

  &:hover {
    background-color: rgba(124, 106, 255, 0.1);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
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

const RoundInfo = styled.div`
  background-color: rgba(124, 106, 255, 0.08);
  border: 1px solid rgba(124, 106, 255, 0.2);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--color-text-muted);
  line-height: 1.8;
  margin-top: 12px;
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const intToBytes = (integer) =>
  new Uint8Array(Buffer.from(integer.toString()));

/**
 * Compiles a TEAL program source string via the algod client.
 * @param {algosdk.Algodv2} client
 * @param {string} programSource
 * @returns {Uint8Array} compiled binary
 */
const compileProgram = async (client, programSource) => {
  const encoder = new TextEncoder();
  const programBytes = encoder.encode(programSource);
  const compileResponse = await client.compile(programBytes).do();
  return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
};

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_CANDIDATES = 20; // Algorand global state limit (24 - 4 setup keys)
const MIN_CANDIDATES = 2;
const ROUND_BUFFER = 10; // Rounds between each phase window

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * CreateElectionModal — The core new feature of AlgoVote.
 *
 * Allows any wallet-connected user to deploy a new election smart contract
 * to Algorand TestNet with:
 *   - A custom election title
 *   - 2–20 dynamically named candidates
 *   - Automatically calculated round windows
 *
 * This extends the hardcoded 4-candidate original into a fully dynamic
 * multi-election platform. Each election is a separate contract instance
 * on-chain, identified by its unique App ID.
 *
 * On successful deployment:
 *   - The App ID is stored in localStorage via saveElection()
 *   - The parent is notified via onElectionCreated() callback
 *
 * @param {boolean}  show              - Modal visibility
 * @param {func}     onHide            - Close handler
 * @param {func}     onElectionCreated - Callback with new election data
 */
export default function CreateElectionModal({ show, onHide, onElectionCreated }) {
  const { client } = useAlgo();

  // ── Form State ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [candidates, setCandidates] = useState(["", ""]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [roundWindows, setRoundWindows] = useState(null);
  const [alert, setAlert] = useState({
    show: false,
    variant: "info",
    title: "",
    message: "",
    loading: false,
  });

  const userAccount = useRef(null);

  // ── Alert Helpers ───────────────────────────────────────────────────────────
  const showAlert = (variant, alertTitle, message, loading = false) => {
    setAlert({ show: true, variant, title: alertTitle, message, loading });
  };

  const hideAlert = () => setAlert((prev) => ({ ...prev, show: false }));

  // ── Candidate Management ────────────────────────────────────────────────────
  const addCandidate = useCallback(() => {
    if (candidates.length < MAX_CANDIDATES) {
      setCandidates((prev) => [...prev, ""]);
    }
  }, [candidates.length]);

  const removeCandidate = useCallback((index) => {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCandidate = useCallback((index, value) => {
    setCandidates((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!title.trim()) {
      showAlert("danger", "Missing Title", "Please enter an election title.");
      return false;
    }

    const filledCandidates = candidates.filter((c) => c.trim() !== "");
    if (filledCandidates.length < MIN_CANDIDATES) {
      showAlert(
        "danger",
        "Not Enough Candidates",
        `Please add at least ${MIN_CANDIDATES} candidates.`
      );
      return false;
    }

    const uniqueCandidates = new Set(filledCandidates.map((c) => c.trim()));
    if (uniqueCandidates.size !== filledCandidates.length) {
      showAlert(
        "danger",
        "Duplicate Candidates",
        "Each candidate name must be unique."
      );
      return false;
    }

    return filledCandidates;
  };

  // ── Preview Round Windows ───────────────────────────────────────────────────
  /**
   * Fetches the current network round and calculates the upcoming
   * registration and voting windows, displaying them to the user
   * before they confirm deployment.
   */
  const previewRounds = useCallback(async () => {
    try {
      const status = await client.status().do();
      const currentRound = status["last-round"];
      const regBegin = currentRound + ROUND_BUFFER;
      const regEnd = regBegin + ROUND_BUFFER;
      const voteBegin = regEnd + ROUND_BUFFER;
      const voteEnd = voteBegin + ROUND_BUFFER;

      setRoundWindows({ regBegin, regEnd, voteBegin, voteEnd, currentRound });
    } catch (err) {
      showAlert("danger", "Network Error", "Could not fetch current round.");
    }
  }, [client]);

  // ── Deploy Election ─────────────────────────────────────────────────────────
  /**
   * Main deployment function.
   *
   * Flow:
   * 1. Validate form inputs
   * 2. Get wallet account from AlgoSigner
   * 3. Fetch current round and calculate windows
   * 4. Read and compile TEAL programs
   * 5. Build and sign the app creation transaction
   * 6. Submit to TestNet and wait for confirmation
   * 7. Initialise candidate tallies (each candidate starts at 0)
   * 8. Save election to localStorage and notify parent
   */
  const deployElection = useCallback(async () => {
    const validCandidates = validate();
    if (!validCandidates) return;

    try {
      setIsDeploying(true);

      // Step 1: Get wallet account
      showAlert(
        "info",
        "Connecting Wallet...",
        "Fetching your AlgoSigner account.",
        true
      );

      if (typeof AlgoSigner === "undefined") {
        showAlert(
          "danger",
          "AlgoSigner Not Found",
          "Please install the AlgoSigner browser extension."
        );
        return;
      }

      await AlgoSigner.connect();
      const accounts = await AlgoSigner.accounts({ ledger: "TestNet" });
      if (!accounts || accounts.length === 0) {
        showAlert("danger", "No Accounts", "No TestNet accounts in AlgoSigner.");
        return;
      }
      userAccount.current = accounts;
      const sender = accounts[0].address;

      // Step 2: Calculate round windows
      showAlert(
        "info",
        "Calculating Windows...",
        "Fetching current network round.",
        true
      );

      const status = await client.status().do();
      const currentRound = status["last-round"];
      const regBegin = currentRound + ROUND_BUFFER;
      const regEnd = regBegin + ROUND_BUFFER;
      const voteBegin = regEnd + ROUND_BUFFER;
      const voteEnd = voteBegin + ROUND_BUFFER;

      // Step 3: Compile TEAL programs
      showAlert(
        "info",
        "Compiling Contract...",
        "Compiling TEAL programs on the network.",
        true
      );

      // Fetch compiled TEAL from the public folder
      const [approvalRes, clearRes] = await Promise.all([
        fetch("/vote_approval.teal"),
        fetch("/vote_clear_state.teal"),
      ]);
      const approvalSource = await approvalRes.text();
      const clearSource = await clearRes.text();

      const approvalBinary = await compileProgram(client, approvalSource);
      const clearBinary = await compileProgram(client, clearSource);

      // Step 4: Build app creation transaction
      showAlert(
        "info",
        "Deploying Election...",
        "Please approve the transaction in AlgoSigner.",
        true
      );

      const params = await client.getTransactionParams().do();
      params.fee = 1000;
      params.flatFee = true;

      const appArgs = [
        intToBytes(regBegin),
        intToBytes(regEnd),
        intToBytes(voteBegin),
        intToBytes(voteEnd),
      ];

      const txn = algosdk.makeApplicationCreateTxn(
        sender,
        params,
        algosdk.OnApplicationComplete.NoOpOC,
        approvalBinary,
        clearBinary,
        0,   // localInts
        1,   // localBytes  (stores "voted")
        24,  // globalInts  (4 setup + up to 20 candidates)
        1,   // globalBytes (stores "Creator")
        appArgs
      );

      // Step 5: Sign via AlgoSigner
      const txn_b64 = await AlgoSigner.encoding.msgpackToBase64(txn.toByte());
      const signedTxs = await AlgoSigner.signTxn([{ txn: txn_b64 }]);
      const binarySignedTx = await AlgoSigner.encoding.base64ToMsgpack(
        signedTxs[0].blob
      );

      // Step 6: Submit and confirm
      const txId = await client.sendRawTransaction(binarySignedTx).do();
      const confirmedTxn = await algosdk.waitForConfirmation(client, txId, 4);
      const txInfo = await client
        .pendingTransactionInformation(txId)
        .do();
      const appId = txInfo["application-index"];

      // Step 7: Save election data
      const electionData = {
        appId,
        title: title.trim(),
        candidates: validCandidates.map((c) => c.trim()),
        creator: sender,
        regBegin,
        regEnd,
        voteBegin,
        voteEnd,
        createdAt: new Date().toISOString(),
        explorerUrl: CONSTANTS.explorerUrl(appId),
        confirmedRound: confirmedTxn["confirmed-round"],
      };

      saveElection(electionData);

      // Step 8: Notify parent and reset
      onElectionCreated(electionData);

      showAlert(
        "success",
        "Election Created!",
        `"${title}" deployed with App ID: ${appId}. Registration opens at round ${regBegin}.`
      );

      // Reset form after short delay
      setTimeout(() => {
        setTitle("");
        setCandidates(["", ""]);
        setRoundWindows(null);
        onHide();
      }, 3000);
    } catch (err) {
      showAlert(
        "danger",
        "Deployment Failed",
        err.message || "Transaction rejected or network error."
      );
    } finally {
      setIsDeploying(false);
    }
  }, [title, candidates, client, onElectionCreated, onHide]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <StyledModal
      show={show}
      onHide={onHide}
      size="lg"
      centered
      aria-labelledby="create-election-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title
          id="create-election-modal"
          style={{ fontFamily: "var(--font-display)", fontWeight: 800 }}
        >
          Create New Election
        </Modal.Title>
      </Modal.Header>

      <Modal.Body style={{ padding: "24px" }}>
        {/* Alert */}
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

        {/* Election Title */}
        <SectionLabel>Election Title</SectionLabel>
        <StyledInput
          type="text"
          placeholder="e.g. Presidential Election 2024, Class Field Trip Vote..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={64}
          disabled={isDeploying}
        />

        {/* Candidates */}
        <SectionLabel>
          Candidates ({candidates.length}/{MAX_CANDIDATES})
        </SectionLabel>

        {candidates.map((candidate, idx) => (
          <CandidateRow key={idx}>
            <StyledInput
              type="text"
              placeholder={`Candidate ${idx + 1}`}
              value={candidate}
              onChange={(e) => updateCandidate(idx, e.target.value)}
              maxLength={32}
              disabled={isDeploying}
            />
            {candidates.length > MIN_CANDIDATES && (
              <RemoveButton
                onClick={() => removeCandidate(idx)}
                disabled={isDeploying}
                aria-label={`Remove candidate ${idx + 1}`}
              >
                Remove
              </RemoveButton>
            )}
          </CandidateRow>
        ))}

        <AddCandidateButton
          onClick={addCandidate}
          disabled={candidates.length >= MAX_CANDIDATES || isDeploying}
        >
          + Add Candidate
        </AddCandidateButton>

        {/* Round Windows Preview */}
        <SectionLabel>Round Windows</SectionLabel>
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={previewRounds}
          disabled={isDeploying}
          style={{
            borderColor: "var(--color-border)",
            color: "var(--color-text-muted)",
            fontFamily: "var(--font-display)",
            fontSize: "0.8rem",
            borderRadius: "var(--radius-sm)",
          }}
        >
          Preview Round Windows
        </Button>

        {roundWindows && (
          <RoundInfo>
            Current Round: {roundWindows.currentRound}
            <br />
            Registration: {roundWindows.regBegin} → {roundWindows.regEnd}
            <br />
            Voting: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{roundWindows.voteBegin} →{" "}
            {roundWindows.voteEnd}
          </RoundInfo>
        )}
      </Modal.Body>

      <Modal.Footer style={{ padding: "16px 24px" }}>
        <SubmitButton onClick={deployElection} disabled={isDeploying}>
          {isDeploying ? "Deploying to TestNet..." : "Deploy Election"}
        </SubmitButton>
      </Modal.Footer>
    </StyledModal>
  );
}
