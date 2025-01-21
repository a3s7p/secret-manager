"use server";

import { sql } from "@vercel/postgres";
import { Secret } from "./types";
import assert from "assert";
import { verifyADR36Amino } from "@keplr-wallet/cosmos";
import { StdSignature } from "@keplr-wallet/types";
import { fromBase64 } from "@cosmjs/encoding";
import crypto, { generateKeyPairSync, sign, verify } from "crypto";

type Result<R> = Promise<
  { ok: true; value: R } | { ok: false; message: string }
>;

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

export const getAuthChallenge: (
  walletAddress: string,
) => Result<string> = async (walletAddress) => {
  try {
    const { rows } =
      await sql`SELECT user_id_seed FROM users WHERE wallet_id = ${walletAddress};`;

    assert(rows.length < 2, "user rows >= 2, this should never happen");
    const salt = rows.at(0)?.user_id_seed || crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000 + 60);
    const nonce = crypto.randomBytes(16).toString("hex");
    const digest = [walletAddress, salt, expiresAt, nonce].join(":");
    const sig = sign(null, Buffer.from(digest), privateKey).toString("hex");

    return {
      ok: true,
      value: [digest, sig].join(":"),
    };
  } catch (error) {
    return { ok: false, message: `Server error: failed to get salt: ${error}` };
  }
};

export const completeAuthChallenge: (
  token: string,
  userSig: StdSignature,
) => Result<string> = async (token, userSig) => {
  try {
    const [addr, salt, expiresAt, nonce, ourSig] = token.split(":", 5);
    const digest = [addr, salt, expiresAt, nonce].join(":");

    const wasSignedHere = verify(
      null,
      Buffer.from(digest),
      publicKey,
      Buffer.from(ourSig, "hex"),
    );

    if (!wasSignedHere) {
      return {
        ok: false,
        message: `Server error: failed to complete auth challenge: server signature failed to verify`,
      };
    }

    const wasSignedThere = verifyADR36Amino(
      "nillion",
      addr,
      token,
      fromBase64(userSig.pub_key.value),
      fromBase64(userSig.signature),
    );

    if (!wasSignedThere) {
      return {
        ok: false,
        message: `Server error: failed to complete auth challenge: client signature failed to verify`,
      };
    }

    await sql`INSERT INTO users (wallet_id, user_id_seed) VALUES (${addr}, ${salt}) ON CONFLICT DO NOTHING;`;
    return { ok: true, value: salt };
  } catch (error) {
    return {
      ok: false,
      message: `Server error: failed to save user: ${error}`,
    };
  }
};

// no delUser -- should there be?..

// secrets

export const getSecrets: (userSeed: string) => Result<Secret[]> = async (
  userSeed,
) => {
  try {
    const { rows } = await sql`
      SELECT store_id, name, created_on, expired_on
      FROM secrets
      WHERE user_id IN (
        SELECT id FROM users WHERE user_id_seed = ${userSeed} LIMIT 1
      );
    `;

    return {
      ok: true,
      value: rows.map((v) => ({
        id: v.store_id,
        name: v.name,
        value: "",
        datatype: "text",
        creationDate: new Date(Date.parse(v.created_on)),
        expirationDate: new Date(Date.parse(v.expired_on)),
        permissions: [],
      })),
    };
  } catch (error) {
    return {
      ok: false,
      message: `Server error: failed to get secrets: ${error}`,
    };
  }
};

export const upsertSecret: (
  userSeed: string,
  secret: Secret,
) => Result<void> = async (userSeed, secret) => {
  try {
    await sql`
        INSERT INTO secrets (user_id, store_id, name, created_on, expired_on)
        SELECT id, ${secret.id}, ${secret.name}, ${secret.creationDate.toISOString()}, ${secret.expirationDate.toISOString()}
        FROM users
        WHERE user_id_seed = ${userSeed}
        ON CONFLICT (store_id)
        DO UPDATE
        SET
          store_id = ${secret.id},
          expired_on = ${secret.expirationDate.toISOString()};
    `;

    for (const perm of secret.permissions) {
      if (perm.read) {
        await sql`
          INSERT INTO permissions (sid, uid_ext, perm_type, granted)
          VALUES (
            ${secret.id},
            ${perm.uid},
            'read',
            CURRENT_DATE
          ) ON CONFLICT DO NOTHING;
        `;
      }

      if (perm.write) {
        await sql`
          INSERT INTO permissions (sid, uid_ext, perm_type, granted)
          VALUES (
            ${secret.id},
            ${perm.uid},
            'write',
            CURRENT_DATE
          ) ON CONFLICT DO NOTHING;
        `;
      }

      if (perm.delete) {
        await sql`
          INSERT INTO permissions (sid, uid_ext, perm_type, granted)
          VALUES (
            ${secret.id},
            ${perm.uid},
            'delete',
            CURRENT_DATE
          ) ON CONFLICT DO NOTHING;
        `;
      }

      if (perm.compute.length > 0) {
        for (const pid of perm.compute) {
          await sql`
            INSERT INTO permissions (sid, uid_ext, perm_type, compute_program_id, granted)
            VALUES (
              ${secret.id},
              ${perm.uid},
              'compute',
              ${pid},
              CURRENT_DATE
            ) ON CONFLICT DO NOTHING;
          `;
        }
      }
    }

    return { ok: true, value: undefined };
  } catch (error) {
    return {
      ok: false,
      message: `Server error: failed to upsert secret: ${error}.`,
    };
  }
};

export const delSecret: (secret: Secret) => Result<void> = async (secret) => {
  try {
    await sql`DELETE FROM secrets WHERE store_id = ${secret.id};`;
    return { ok: true, value: undefined };
  } catch (error) {
    return {
      ok: false,
      message: `Server error: failed to delete secret: ${error}`,
    };
  }
};

// permissions

export const delPermission: (
  secretId: string,
  permType: string,
  userIdExt: string,
) => Result<void> = async (secretId, permType, userIdExt) => {
  await sql`DELETE FROM permissions WHERE sid = ${secretId} AND uid_ext = ${userIdExt} AND perm_type =  ${permType};`;
  return { ok: true, value: undefined };
};
