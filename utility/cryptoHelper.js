var crypto = require('crypto');

var algorithm = 'aes-256-ctr',
    password = '1ahtSUt7l7PFOG3EMjSc4SyCGGRbWuUc',
    // do not use a global iv for production, 
    // generate a new one for each encryption
    iv = '8GH1XxbdmMc3MlPB';

module.exports = {
    decrypt(cipherText) {
        if (!cipherText) {
            return '';
        }
        const decipher = crypto.createDecipheriv(algorithm, password, iv)
        return decipher.update(cipherText, 'hex', 'utf8') + decipher.final('utf8')
    }
    , encrypt(text) {
        if (!text) {
            return '';
        }
        const cipher = crypto.createCipheriv(algorithm, password, iv)
        return cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
    }
}