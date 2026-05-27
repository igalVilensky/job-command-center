import crypto from "node:crypto";
import { env } from "../config/env";

const VERSION = "v1";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

const base64UrlEncode = (value: Buffer) => value.toString("base64url");

const base64UrlDecode = (value: string) => Buffer.from(value, "base64url");

const encryptionKey = () => {
  const secret = env.emailTokenEncryptionKey.trim();

  if (!secret || secret.startsWith("replace_me")) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY is required for Gmail token storage");
  }

  const base64Key = Buffer.from(secret, "base64");
  if (base64Key.length === 32) {
    return base64Key;
  }

  if (secret.length < 32) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY must be at least 32 characters or a 32-byte base64 value");
  }

  return crypto.createHash("sha256").update(secret).digest();
};

export const assertTokenEncryptionConfigured = () => {
  encryptionKey();
};

export const encryptToken = (token: string) => {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv, {
    authTagLength: AUTH_TAG_BYTES
  });
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [VERSION, base64UrlEncode(iv), base64UrlEncode(authTag), base64UrlEncode(encrypted)].join(":");
};

export const decryptToken = (value: string) => {
  const [version, ivText, authTagText, encryptedText] = value.split(":");

  if (version !== VERSION || !ivText || !authTagText || !encryptedText) {
    throw new Error("Encrypted token has an unsupported format");
  }

  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), base64UrlDecode(ivText), {
    authTagLength: AUTH_TAG_BYTES
  });
  decipher.setAuthTag(base64UrlDecode(authTagText));

  return Buffer.concat([
    decipher.update(base64UrlDecode(encryptedText)),
    decipher.final()
  ]).toString("utf8");
};
