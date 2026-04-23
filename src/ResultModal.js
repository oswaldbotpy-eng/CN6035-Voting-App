import React from 'react';
import { Modal, Table } from 'react-bootstrap';
import { CONSTANTS } from './Constants';

export default function ResultModal({ show, onHide, data, loading }) {

  const totalVotes = data.reduce((sum, c) => sum + c.votes, 0);

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Election Results</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <h4>Loading...</h4>
        ) : (
          <>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Votes</th>
                </tr>
              </thead>

              <tbody>
                {data.map((c, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{c.name}</td>
                    <td>{c.votes}</td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <h5>Total Votes: {totalVotes}</h5>

            <a href={CONSTANTS.explorer(CONSTANTS.APP_ID)}>
              View on AlgoExplorer
            </a>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
}
