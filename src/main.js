import { useState, useEffect } from 'react';
import { Button, Row, Col, Container, Spinner } from 'react-bootstrap';
import styled from 'styled-components';
import algosdk from 'algosdk';
import { CONSTANTS } from './Constants';
import CandidateModal from './CandidateModal';
import ResultModal from './ResultModal';

const Wrapper = styled.div`
  display: flex;
`;

const Title = styled.h1`
  color: #6C63FF;
  font-size: 64px;
  margin-top: 80px;
`;

const SubText = styled.p`
  font-size: 20px;
  margin: 20px 0;
`;

export default function MainContent() {
  const [showCandidate, setShowCandidate] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  const client = new algosdk.Algodv2(
    CONSTANTS.algodToken,
    CONSTANTS.baseServer,
    CONSTANTS.port
  );

  // 🔓 Decode Algorand global state
  const decodeState = (state) => {
    return state.map(item => {
      const key = atob(item.key);

      let value;
      if (item.value.type === 1) {
        value = atob(item.value.bytes);
      } else {
        value = item.value.uint;
      }

      return { key, value };
    });
  };

  // 🎯 Extract only candidates
  const extractCandidates = (decoded) => {
    const systemKeys = ["RegBegin", "RegEnd", "VoteBegin", "VoteEnd", "Creator"];

    return decoded
      .filter(item => !systemKeys.includes(item.key))
      .map(item => ({
        name: item.key,
        votes: item.value
      }));
  };

  // 📡 Fetch candidates from blockchain
  const fetchCandidates = async () => {
    setLoading(true);

    try {
      const res = await client.getApplicationByID(CONSTANTS.APP_ID).do();
      const globalState = res.params["global-state"];

      const decoded = decodeState(globalState);
      const extracted = extractCandidates(decoded);

      setCandidates(extracted);

    } catch (err) {
      console.error("Error fetching candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load on page start
  useEffect(() => {
    fetchCandidates();
  }, []);

  // 🗳️ Voting
  const handleVote = async (candidateName) => {
    console.log("Voting for:", candidateName);

    // after vote → refresh data
    await fetchCandidates();
  };

  return (
    <Wrapper>
      <Container>
        <Row>
          <Col>
            <Title>Decentralised Voting</Title>
            <SubText>Vote securely using Algorand blockchain</SubText>

            <Button
              style={{ backgroundColor: '#6C63FF' }}
              onClick={() => setShowCandidate(true)}
            >
              VOTE NOW
            </Button>

            <Button
              style={{ marginLeft: '20px', backgroundColor: 'green' }}
              onClick={async () => {
                await fetchCandidates();
                setShowResult(true);
              }}
            >
              VIEW RESULTS
            </Button>

            {loading && (
              <div style={{ marginTop: '20px' }}>
                <Spinner animation="border" />
              </div>
            )}

            <CandidateModal
              show={showCandidate}
              onHide={() => setShowCandidate(false)}
              candidates={candidates}
              onVote={handleVote}
            />

            <ResultModal
              show={showResult}
              onHide={() => setShowResult(false)}
              data={candidates}
              loading={loading}
            />
          </Col>
        </Row>
      </Container>
    </Wrapper>
  );
}
