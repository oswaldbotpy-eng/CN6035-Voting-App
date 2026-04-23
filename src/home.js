import { useState, useEffect } from 'react';
import { Button, Row, Col, Container } from 'react-bootstrap';
import styled from 'styled-components';
import vote from '../assets/images/vote.svg';
import voting from '../assets/images/voting.svg';
import select from '../assets/images/select.svg';
import result from '../assets/images/result.svg';
import wallet from '../assets/images/wallet.svg';
import CandidateModal from './CandidateModal';
import ResultModal from './ResultModal';
import { CONSTANTS } from './Constants';
import algosdk from 'algosdk';

const Wrapper = styled.div`
  display: flex;
`;

const Title = styled.h1`
  color: #6C63FF;
  font-size: 64px;
  margin-top: 80px;
`;

export default function MainContent({ userAddress }) {
  const [showCandidate, setShowCandidate] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ NEW
  const [hasVoted, setHasVoted] = useState(false);

  const client = new algosdk.Algodv2(
    CONSTANTS.algodToken,
    CONSTANTS.baseServer,
    CONSTANTS.port
  );

  // 🔍 Decode global state
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

  // 🎯 Extract candidates
  const extractCandidates = (decoded) => {
    const systemKeys = ["RegBegin", "RegEnd", "VoteBegin", "VoteEnd", "Creator"];

    return decoded
      .filter(item => !systemKeys.includes(item.key))
      .map(item => ({
        name: item.key,
        votes: item.value
      }));
  };

  // 📡 Fetch candidates
  const fetchCandidates = async () => {
    setLoading(true);

    try {
      const res = await client.getApplicationByID(CONSTANTS.APP_ID).do();
      const globalState = res.params["global-state"];

      const decoded = decodeState(globalState);
      const candidates = extractCandidates(decoded);

      setCandidates(candidates);

    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: check if user already voted
  const checkIfVoted = async (address) => {
    try {
      const accountInfo = await client.accountInformation(address).do();

      const apps = accountInfo['apps-local-state'] || [];
      const app = apps.find(a => a.id === CONSTANTS.APP_ID);

      if (!app || !app['key-value']) {
        setHasVoted(false);
        return;
      }

      const votedKey = app['key-value'].find(
        item => atob(item.key) === "voted"
      );

      setHasVoted(!!votedKey);

    } catch (err) {
      console.error("Vote check failed:", err);
      setHasVoted(false);
    }
  };

  // Load on start
  useEffect(() => {
    fetchCandidates();
  }, []);

  // ✅ NEW: run when wallet connects
  useEffect(() => {
    if (userAddress) {
      checkIfVoted(userAddress);
    }
  }, [userAddress]);

  // 🗳️ Voting handler
  const handleVote = async (candidateName) => {
    console.log("Voting for:", candidateName);

    await fetchCandidates();

    // ✅ refresh vote status after voting
    if (userAddress) {
      await checkIfVoted(userAddress);
    }
  };

  const candidateHandler = () => {
    setShowCandidate(true);
  };

  const resultHandler = async () => {
    await fetchCandidates();
    setShowResult(true);
  };

  return (
    <Wrapper>
      <Container>
        <Row>
          <Col>
            <Title>Decentralised Voting</Title>
            <p>Vote for the right candidate!</p>

            {/* ✅ Disable button if already voted */}
            <Button 
              onClick={candidateHandler}
              disabled={hasVoted}
            >
              {hasVoted ? "ALREADY VOTED" : "VOTE NOW"}
            </Button>

            <Button
              style={{ marginLeft: '20px' }}
              onClick={resultHandler}
            >
              RESULT
            </Button>

            {/* ✅ Pass hasVoted */}
            <CandidateModal
              show={showCandidate}
              onHide={() => setShowCandidate(false)}
              candidates={candidates}
              onVote={handleVote}
              hasVoted={hasVoted}
            />

            <ResultModal
              show={showResult}
              onHide={() => setShowResult(false)}
              data={candidates}
              loading={loading}
            />
          </Col>

          <Col>
            <img src={vote} alt="vote" />
          </Col>
        </Row>

        <h4 style={{ textAlign: "center", marginTop: "40px" }}>
          HOW TO VOTE
        </h4>

        <Row className="justify-content-md-evenly">
          <Col md="auto">
            <img src={wallet} width="48" alt="wallet" />
            <h5>Connect Wallet</h5>
          </Col>

          <Col md="auto">
            <img src={select} width="48" alt="register" />
            <h5>Register</h5>
          </Col>

          <Col md="auto">
            <img src={voting} width="48" alt="vote" />
            <h5>Submit Vote</h5>
          </Col>

          <Col md="auto">
            <img src={result} width="48" alt="result" />
            <h5>View Results</h5>
          </Col>
        </Row>
      </Container>
    </Wrapper>
  );
}
