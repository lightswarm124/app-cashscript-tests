// Set NETWORK to either testnet or mainnet
const NETWORK = 'testnet';
const JWTToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjVlOGUzMGU2MDIyMWMxMDAxMmFkOTQwNyIsImVtYWlsIjoibGlnaHRzd2FybUBnbWFpbC5jb20iLCJhcGlMZXZlbCI6MCwicmF0ZUxpbWl0IjozLCJpYXQiOjE1OTEyMTIyNzEsImV4cCI6MTU5MzgwNDI3MX0.UZoJwGt52H4-MClC6HWIDGQInVBVGytWiPKO6ayEpUo';

// REST API servers.
const MAINNET_API = 'https://api.fullstack.cash/v3/';
const TESTNET_API = 'https://tapi.fullstack.cash/v3/';

// bch-js-examples require code from the main bch-js repo
const BCHJS = require('@chris.troutner/bch-js');

const { BITBOX } = require('bitbox-sdk');
const { Contract, SignatureTemplate } = require('cashscript');
const { SignPassword } = require('./signPassword.js');
const path = require('path');


run("testPassword");
async function run(inputPassword) {
  try {

    // Instantiate bch-js based on the network.
    let bchjs;
    if (NETWORK === 'mainnet') {
      bchjs = new BCHJS({
        restURL: MAINNET_API,
        apiToken: JWTToken
      });
    } else {
      bchjs = new BCHJS({
        restURL: TESTNET_API,
        apiToken: JWTToken
      });
    }
/*
    const network = 'testnet';
    const bitbox = new BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });
    let transactionBuilder = new bitbox.TransactionBuilder(network);
*/
    // Initialise HD node and alice's keypair
    //const mnemonic = "replace this test with your own test account mnemonic words ";
    const mnemonic = "talk story visual hidden behind wasp evil abandon bus brand circle sketch";
    const rootSeed = await bchjs.Mnemonic.toSeed(mnemonic);
    const hdNode = bchjs.HDNode.fromSeed(rootSeed, NETWORK);
    const account = bchjs.HDNode.derivePath(hdNode, "m/44'/1'/0'/0/0")
    const alice = bchjs.HDNode.toKeyPair(account);

    // Derive alice's public key and public key hash
    const alicePk = bchjs.ECPair.toPublicKey(alice);
    const alicePkh = bchjs.Crypto.hash160(alicePk);
    const aliceAddr = bchjs.HDNode.toCashAddress(account);
    console.log(aliceAddr);

    const pwManager = new SignPassword(alice);
    const createPW = pwManager.createPassword(inputPassword);
    const signPWW = pwManager.signPassword(createPW);

    const badPW = pwManager.createPassword("badPassword");


    const Bip38 = Contract.compile(path.join(__dirname, 'bip38.cash'), NETWORK);
    const instance = Bip38.new(signPWW);

    const contractBalance = await instance.getBalance();
    console.log('contract balance:', contractBalance);
    console.log('contract address:', instance.address);

    const remainder = contractBalance - 546 - 1000;

    const tx = await instance.functions
      .spend(new SignatureTemplate(alice), alicePk, createPW)
/*      .withOpReturn([
          '0x534c5000', // Lokad ID
          '0x01', // Token type
          'GENESIS', // Action
          'Test', // Symbol
          'TestToken', // Name
          'https://slp.dev/', // Document URI
          '', // Document hash
          '0x00', // Decimals
          '0x02', // Minting baton vout
          '0x0000000000000001', // Initial quantity
        ])
*/
      .to(instance.address, 546)
      .to(instance.address, remainder)
      .send();
    console.log("tx", tx);

/*
// for test funding the p2sh address

    const aliceUTXO = await bchjs.Address.utxo(aliceAddr);

    const utxo = findBiggestUtxo(aliceUTXO.utxos);
    const originalAmount = utxo.satoshis;
    const vout = utxo.vout;
    const txid = utxo.txid;

    transactionBuilder.addInput(txid, vout);

    const byteCount = bchjs.BitcoinCash.getByteCount(
      { P2PKH: 1 },
      { P2PKH: 2}
    );
    const satoshisPerByte = 1.0;
    const txFee = Math.floor(satoshisPerByte * byteCount);
    const send_amount = 3000;
    const remainder = originalAmount - send_amount - txFee;

    transactionBuilder.addOutput('bchtest:pzau9tg8w99n28smshv4meqyh85dpzhcncy67klwld', send_amount);
    transactionBuilder.addOutput(aliceAddr, remainder);

    let redeemScript;
    transactionBuilder.sign(
      0,
      alice,
      redeemScript,
      transactionBuilder.hashTypes.SIGHASH_ALL,
      originalAmount
    );

    const tx = transactionBuilder.build();
    const hex = tx.toHex();

    const txidStr = await bchjs.RawTransactions.sendRawTransaction([hex]);
    console.log(`https://explorer.bitcoin.com/tbch/tx/${txidStr}`);
*/
  } catch (err) {
    console.log('error:', err);
  }
}

// for test funding the p2sh address
function findBiggestUtxo(utxos) {
  let largestAmount = 0;
  let largestIndex = 0;

  for (var i = 0; i < utxos.length; i++) {
    const thisUtxo = utxos[i];

    if (thisUtxo.satoshis > largestAmount) {
      largestAmount = thisUtxo.satoshis;
      largestIndex = i;
    }
  }

  return utxos[largestIndex];
}
