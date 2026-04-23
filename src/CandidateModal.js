import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import styled from 'styled-components';

const RadioContainer = styled.div`
  border: 0.5px solid #ccc;
  padding: 10px;
  margin: 12px 0;
  display: flex;
  justify-content: space-between;
  flex-direction: row-reverse;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background-color: #f5f5f5;
  }

  .title {
    font-size: 16px;
    padding: 6px;
  }
`;

export default function CandidateModal({ show, onHide, candidates = [], onVote }) {
  const [selected, setSelected] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitVoteHandler = async () => {
    if (!selected) return;

    setSubmitting(true);

    try {
      await onVote(selected);
      onHide(); // close modal after successful vote
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Vote for a Candidate</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {candidates.length === 0 ? (
          <p>No candidates available</p>
        ) : (
          candidates.map((candidate, idx) => (
            <RadioContainer key={idx}>
              <input
                type="radio"
                name="candidates"
                value={candidate.name}
                checked={selected === candidate.name}
                onChange={(e) => setSelected(e.target.value)}
              />

              <label className="title">
                {candidate.name}
                <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
                  Votes: {candidate.votes}
                </p>
              </label>
            </RadioContainer>
          ))
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onHide}
          disabled={submitting}
        >
          Cancel
        </Button>

        <Button
          variant="primary"
          onClick={submitVoteHandler}
          disabled={submitting || !selected}
        >
          {submitting ? "Submitting..." : "Submit Vote"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
