import React from "react";
import { Alert, Spinner } from "react-bootstrap";
import styled from "styled-components";
 
const StyledAlert = styled(Alert)`
  border-radius: var(--radius) !important;
  border: 1px solid transparent !important;
  font-family: var(--font-display);
  font-size: 0.9rem;
 
  &.alert-success {
    background-color: rgba(61, 255, 176, 0.1) !important;
    border-color: rgba(61, 255, 176, 0.3) !important;
    color: var(--color-success) !important;
  }
 
  &.alert-danger {
    background-color: rgba(255, 77, 109, 0.1) !important;
    border-color: rgba(255, 77, 109, 0.3) !important;
    color: var(--color-danger) !important;
  }
 
  &.alert-warning {
    background-color: rgba(255, 122, 61, 0.1) !important;
    border-color: rgba(255, 122, 61, 0.3) !important;
    color: var(--color-accent) !important;
  }
 
  &.alert-info {
    background-color: rgba(124, 106, 255, 0.1) !important;
    border-color: rgba(124, 106, 255, 0.3) !important;
    color: var(--color-primary) !important;
  }
 
  .btn-close {
    filter: invert(1) opacity(0.6);
  }
`;
 
/**
 * MessageAlert — Reusable feedback component.
 *
 * Used throughout the app to surface blockchain transaction outcomes
 * (success, failure, pending) to the user in a consistent way.
 *
 * Improvement over the original: added loading spinner support for
 * pending transaction states, and styled to match the dark theme.
 *
 * @param {boolean} show     - Whether the alert is visible
 * @param {string}  variant  - Bootstrap variant: success | danger | warning | info
 * @param {string}  title    - Alert heading
 * @param {string}  message  - Alert body text
 * @param {boolean} loading  - Shows a spinner instead of text when true
 * @param {func}    close    - Handler to dismiss the alert
 */
export default function MessageAlert({
  show,
  variant = "info",
  title,
  message,
  loading = false,
  close,
}) {
  return (
    <StyledAlert
      show={show}
      variant={variant}
      onClose={close}
      dismissible={!loading}
    >
      <Alert.Heading
        style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Spinner animation="border" size="sm" />
            {title}
          </span>
        ) : (
          title
        )}
      </Alert.Heading>
      {message && (
        <p style={{ marginBottom: 0, marginTop: "6px", opacity: 0.85 }}>
          {message}
        </p>
      )}
    </StyledAlert>
  );
}
 
