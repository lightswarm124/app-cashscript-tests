const { Script, Crypto } = require('bitbox-sdk');

class SignPassword {
  constructor(keypair) {
    this.keypair = keypair;
  };

  createPassword(password) {
    return Buffer.from(password, 'utf8');
  }

  signPassword(pwBuffer) {
    return this.keypair.sign(new Crypto().sha256(pwBuffer)).toDER();
  }
}

module.exports = {SignPassword: SignPassword};
