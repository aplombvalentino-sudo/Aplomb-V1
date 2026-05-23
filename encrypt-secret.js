const sodium = require("tweetsodium");

const publicKey = process.argv[2];
const secretValue = process.argv[3];

const key = Buffer.from(publicKey, "base64");
const value = Buffer.from(secretValue);
const encrypted = sodium.seal(value, key);
console.log(Buffer.from(encrypted).toString("base64"));
