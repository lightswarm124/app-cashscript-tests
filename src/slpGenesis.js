const { BITBOX } = require('bitbox-sdk');
const { Contract, Sig } = require('cashscript');
const { SignPassword } = require('./signPassword.js');
const path = require('path');


run("testPassword");
async function run(inputPassword) {
  try {
    const network = 'testnet';
    const bitbox = new BITBOX({ restURL: 'https://trest.bitcoin.com/v2/' });
    let transactionBuilder = new bitbox.TransactionBuilder(network);

    // Initialise HD node and alice's keypair
    //const mnemonic = "replace this test with your own test account mnemonic words ";
    const mnemonic = "talk story visual hidden behind wasp evil abandon bus brand circle sketch";
    const rootSeed = bitbox.Mnemonic.toSeed(mnemonic);
    const hdNode = bitbox.HDNode.fromSeed(rootSeed, network);
    const account = bitbox.HDNode.derivePath(hdNode, "m/44'/1'/0'/0/0")
    const alice = bitbox.HDNode.toKeyPair(account);

    // Derive alice's public key and public key hash
    const alicePk = bitbox.ECPair.toPublicKey(alice);
    const alicePkh = bitbox.Crypto.hash160(alicePk);
    const aliceAddr = bitbox.HDNode.toCashAddress(account);
    console.log(aliceAddr);

    const pwManager = new SignPassword(alice);
    const createPW = pwManager.createPassword(inputPassword);
    const signPWW = pwManager.signPassword(createPW);

    const badPW = pwManager.createPassword("badPassword");


    const createSLP = Contract.compile(path.join(__dirname, 'CreateSLP.cash'), network);
    const instance = createSLP.new(alicePkh);

    const contractBalance = await instance.getBalance();
    console.log('contract balance:', contractBalance);
    console.log('contract address:', instance.address);

    const remainder = contractBalance - 546 - 1000;
    const tx = await instance.functions
      .SLPGenesis(
        alicePk,
        new Sig(alice),
        "Test",
        "TestToken",
        "https://slp.dev/",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        "0x00",
        "0x02",
        "0x0000000000000001"
      )
      .meep([
        {
          opReturn: [
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
          ],
        },
        { to: instance.address, amount: 546 },
        { to: instance.address, amount: remainder },
      ]);

    console.log("tx", tx);

/*
// for test funding the p2sh address

    const aliceUTXO = await bitbox.Address.utxo(aliceAddr);

    const utxo = findBiggestUtxo(aliceUTXO.utxos);
    const originalAmount = utxo.satoshis;
    const vout = utxo.vout;
    const txid = utxo.txid;

    transactionBuilder.addInput(txid, vout);

    const byteCount = bitbox.BitcoinCash.getByteCount(
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

    const txidStr = await bitbox.RawTransactions.sendRawTransaction([hex]);
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
