/*global AlgoSigner*/
import React, { useRef, useState, useCallback } from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import styled from "styled-components";
import algosdk from "algosdk";
import { CONSTANTS } from "./Constants";
import MessageAlert from "./Alert";
import { useAlgo } from "../App";
 
// ── Styled Components ─────────────────────────────────────────────────────────
 
const HeaderWrapper = styled.header`
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 16px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
`;
 
const AppTitle = styled.h1`
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.5px;
 
  span {
    color: var(--color-primary);
  }
`;
 
const WalletAddress = styled.span`
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: var(--color-border);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  display: inline-block;
`;
 
const ConnectButton = styled(Button)`
  background-color: var(--color-primary) !important;
  border: none !important;
  border-radius: var(--radius-sm) !important;
  font-family: var(--font-display) !important;
  font-weight: 600 !important;
  font-size: 0.85rem !important;
  padding: 8px 16px !important;
  transition: background-color var(--transition) !important;
 
  &:hover {
    background-color: var(--color-primary-hover) !important;
  }
 
  &:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }
`;
 
const RegisterButton = styled(Button)`
  background-color: transparent !important;
  border: 1px solid var(--color-accent) !important;
  color: var(--color-accent) !important;
  border-radius: var(--radius-sm) !important;
  font-family: var(--font-display) !important;
  font-weight: 600 !important;
  font-size: 0.85rem !important;
  padding: 8px 16px !important;
  transition: all var(--transition) !important;
 
  &:hover {
    background-color: var(--color-accent) !important;
    color: white !important;
  }
 
  &:disabled {
    opacity: 0.4 !important;
    cursor: not-allowed !important;
  }
`;
 
const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ connected }) =>
    connected ? "var(--color-success)" : "var(--color-text-muted)"};
  display: inline-block;
  margin-right: 6px;
  transition: background-color var(--transition);
`;
 
// ── Helpers ───────────────────────────────────────────────────────────────────
 
/**
 * Truncates a wallet address for display.
 * e.g. "ABCDE...WXYZ"
 */
const truncateAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
};
 
// ── Component ─────────────────────────────────────────────────────────────────
 
/**
 * Header — Wallet connection and voter registration.
 *
 * Improvements over original:
 * - Wallet connection state is displayed (connected address shown)
 * - Success and error alerts for both connect and register actions
 * - useAlgo() hook for shared algod client (no re-instantiation)
 * - useCallback for stable function references
 * - Disabled state on buttons while actions are pending
 *
 * @param {number|null} activeElectionId - App ID of the currently selected election
 */
export default function Header({ activeElectionId }) {
  const { client } = useAlgo();
 
  const [alert, setAlert] = useState({
    show: false,
    variant: "info",
    title: "",
    message: "",
    loading: false,
  });
 
  const [walletConnected, setWalletConnected] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const userAccount = useRef(null);
 
  const showAlert = (variant, title, message, loading = false) => {
    setAlert({ show: true, variant, title, message, loading });
  };
 
  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };
 
  // ── Connect Wallet ──────────────────────────────────────────────────────────
  const connectAlgoSigner = useCallback(async () => {
    try {
      if (typeof AlgoSigner === "undefined") {
        showAlert(
          "danger",
          "AlgoSigner Not Found",
          "Please install the AlgoSigner browser extension to continue."
        );
        return;
      }
 
      await AlgoSigner.connect();
      const accounts = await AlgoSigner.accounts({ ledger: "TestNet" });
 
      if (!accounts || accounts.length === 0) {
        showAlert(
          "warning",
          "No Accounts Found",
          "No TestNet accounts found in AlgoSigner. Please add one."
        );
        return;
      }
 
      userAccount.current = accounts;
      setWalletConnected(true);
      showAlert(
        "success",
        "Wallet Connected",
        `Connected as ${truncateAddress(accounts[0].address)}`
      );
    } catch (err) {
      showAlert("danger", "Connection Failed", err.message || "Unknown error");
    }
  }, []);
 
  // ── Register (OptIn) ────────────────────────────────────────────────────────
  const register = useCallback(async () => {
    if (!walletConnected || !userAccount.current) {
      showAlert(
        "danger",
        "Wallet Not Connected",
        "Please connect your wallet before registering."
      );
      return;
    }
 
    if (!activeElectionId) {
      showAlert(
        "warning",
        "No Election Selected",
        "Please select an election before registering."
      );
      return;
    }
 
    try {
      setIsRegistering(true);
      showAlert(
        "info",
        "Registering...",
        "Please approve the transaction in AlgoSigner.",
        true
      );
 
      const sender = userAccount.current[0].address;
      const params = await client.getTransactionParams().do();
      params.fee = 1000;
      params.flatFee = true;
 
      const txn = algosdk.makeApplicationOptInTxn(
        sender,
        params,
        activeElectionId
      );
 
      // Sign via AlgoSigner — private key never leaves the extension
      const txn_b64 = await AlgoSigner.encoding.msgpackToBase64(txn.toByte());
      const signedTxs = await AlgoSigner.signTxn([{ txn: txn_b64 }]);
      const binarySignedTx = await AlgoSigner.encoding.base64ToMsgpack(
        signedTxs[0].blob
      );
 
      const txId = await client.sendRawTransaction(binarySignedTx).do();
      await algosdk.waitForConfirmation(client, txId, 4);
 
      showAlert(
        "success",
        "Registered Successfully",
        "You are now registered to vote in this election."
      );
    } catch (err) {
      showAlert(
        "danger",
        "Registration Failed",
        err.message || "Transaction rejected or failed."
      );
    } finally {
      setIsRegistering(false);
    }
  }, [walletConnected, activeElectionId, client]);
 
  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <HeaderWrapper>
      <Container>
        <Row className="align-items-center">
          {/* Logo / Title */}
          <Col>
            <AppTitle>
              Algo<span>Vote</span>
            </AppTitle>
          </Col>
 
          {/* Wallet Status */}
          <Col className="text-center">
            {walletConnected && userAccount.current && (
              <WalletAddress>
                <StatusDot connected={1} />
                {truncateAddress(userAccount.current[0].address)}
              </WalletAddress>
            )}
          </Col>
 
          {/* Actions */}
          <Col className="d-flex justify-content-end gap-2">
            <RegisterButton
              onClick={register}
              disabled={isRegistering || !walletConnected}
            >
              {isRegistering ? "Registering..." : "Register"}
            </RegisterButton>
 
            <ConnectButton
              onClick={connectAlgoSigner}
              disabled={walletConnected}
            >
              {walletConnected ? (
                <>
                  <StatusDot connected={1} />
                  Connected
                </>
              ) : (
                "Connect Wallet"
              )}
            </ConnectButton>
          </Col>
        </Row>
 
        {/* Alert — full width below the nav row */}
        {alert.show && (
          <Row style={{ marginTop: "12px" }}>
            <Col>
              <MessageAlert
                show={alert.show}
                variant={alert.variant}
                title={alert.title}
                message={alert.message}
                loading={alert.loading}
                close={hideAlert}
              />
            </Col>
          </Row>
        )}
      </Container>
    </HeaderWrapper>
  );
}
 
