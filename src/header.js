/*global AlgoSigner*/
import React, { useState } from 'react';
import { Container, Row, Col, Button } from 'react-bootstrap';
import logo from '../assets/images/AlgoVote.svg';
import { CONSTANTS } from './Constants';
import algosdk from 'algosdk';
import MessageAlert from './Alert';

export default function Header() {
  const client = new algosdk.Algodv2(
    CONSTANTS.algodToken,
    CONSTANTS.baseServer,
    CONSTANTS.port
  );

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState({
    show: false,
    variant: "info",
    title: "",
    message: ""
  });

  // 🔌 Connect Wallet
  const connectAlgoSigner = async () => {
    try {
      await AlgoSigner.connect();

      const accounts = await AlgoSigner.accounts({
        ledger: 'TestNet'
      });

      setAccount(accounts[0].address);

      setAlert({
        show: true,
        variant: "success",
        title: "Wallet Connected",
        message: `Connected: ${accounts[0].address.slice(0, 6)}...`
      });

    } catch (err) {
      console.error(err);
      setAlert({
        show: true,
        variant: "danger",
        title: "Connection Failed",
        message: "Unable to connect to AlgoSigner"
      });
    }
  };

  // 📝 Opt-in (Register)
  const optIn = async () => {
    if (!account) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Wallet Required",
        message: "Please connect your wallet first"
      });
      return;
    }

    setLoading(true);

    try {
      const params = await client.getTransactionParams().do();
      params.fee = 1000;
      params.flatFee = true;

      const txn = algosdk.makeApplicationOptInTxn(
        account,
        params,
        CONSTANTS.APP_ID
      );

      const txn_b64 = await AlgoSigner.encoding.msgpackToBase64(txn.toByte());

      const signedTxs = await AlgoSigner.signTxn([{ txn: txn_b64 }]);

      const binarySignedTx = await AlgoSigner.encoding.base64ToMsgpack(
        signedTxs[0].blob
      );

      const txId = await client.sendRawTransaction(binarySignedTx).do();

      await algosdk.waitForConfirmation(client, txId, 4);

      setAlert({
        show: true,
        variant: "success",
        title: "Registration Successful",
        message: "You have successfully registered to vote"
      });

    } catch (err) {
      console.error(err);
      setAlert({
        show: true,
        variant: "danger",
        title: "Registration Failed",
        message: "Something went wrong during opt-in"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ marginTop: '24px' }}>
      <Row className="align-items-center">
        
        {/* Logo */}
        <Col>
          <img src={logo} alt="AlgoVote" />
        </Col>

        {/* Actions */}
        <Col md="auto">
          <Button
            style={{ backgroundColor: 'orange', marginRight: '10px' }}
            onClick={optIn}
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </Button>

          <Button
            style={{ backgroundColor: '#6C63FF' }}
            onClick={connectAlgoSigner}
          >
            {account ? "Connected" : "Connect Wallet"}
          </Button>
        </Col>
      </Row>

      {/* Alert */}
      <Row>
        <Col>
          <MessageAlert
            show={alert.show}
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            onClose={() => setAlert({ ...alert, show: false })}
            autoClose={true}
          />
        </Col>
      </Row>
    </Container>
  );
}
