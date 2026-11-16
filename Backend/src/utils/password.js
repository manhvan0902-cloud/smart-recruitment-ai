"use strict";

const crypto = require("node:crypto");
const { promisify } = require("node:util");
const bcrypt = require("bcrypt");

const scryptAsync = promisify(crypto.scrypt);
const scryptParameters = { N: 16384, r: 8, p: 1, keyLength: 64 };

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, scryptParameters.keyLength, {
    N: scryptParameters.N,
    r: scryptParameters.r,
    p: scryptParameters.p,
    maxmem: 32 * 1024 * 1024,
  });
  return [
    "scrypt",
    scryptParameters.N,
    scryptParameters.r,
    scryptParameters.p,
    salt.toString("hex"),
    derivedKey.toString("hex"),
  ].join("$");
}

async function verifyPassword(password, encodedHash) {
  if (typeof encodedHash !== "string") return false;
  if (!encodedHash.startsWith("scrypt$")) {
    return bcrypt.compare(password, encodedHash);
  }

  const [algorithm, nText, rText, pText, saltText, hashText, extra] = encodedHash.split("$");
  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (
    algorithm !== "scrypt" ||
    extra !== undefined ||
    !Number.isInteger(N) ||
    N < 2 ||
    N > 262144 ||
    (N & (N - 1)) !== 0 ||
    !Number.isInteger(r) ||
    r < 1 ||
    r > 16 ||
    !Number.isInteger(p) ||
    p < 1 ||
    p > 4 ||
    !/^(?:[a-f\d]{32,128})$/i.test(saltText || "") ||
    !/^(?:[a-f\d]{128})$/i.test(hashText || "")
  ) {
    return false;
  }
  const salt = Buffer.from(saltText, "hex");
  const expected = Buffer.from(hashText, "hex");
  const actual = await scryptAsync(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: Math.max(32 * 1024 * 1024, 128 * N * r + 128 * r * p + 1024),
  });
  return crypto.timingSafeEqual(actual, expected);
}

function getPasswordVersion(passwordHash) {
  return crypto.createHash("sha256").update(passwordHash).digest("hex");
}

module.exports = { hashPassword, verifyPassword, getPasswordVersion };
