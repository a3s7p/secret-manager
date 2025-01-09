"use server"

import { Uuid } from "@nillion/client-vms"
import { sql } from "@vercel/postgres"
import { Secret } from "./types"

// users

export async function findOrAddUser(walletAddress: string) {
  const { rows } = await sql`
    INSERT INTO users (wallet_id)
    VALUES (${walletAddress})
    ON CONFLICT (wallet_id) DO UPDATE
    SET id = users.id
    RETURNING users.user_id_seed;
  `;

  return rows.at(0)?.user_id_seed as Uuid
}

// no delUser -- should there be?..

// secrets

export const getSecrets: (userSeed: Uuid) => Promise<Secret[] | string> = async (userSeed: Uuid) => {
  try {
    const { rows } = await sql`
      SELECT store_id, name, created_on, expired_on
      FROM secrets
      WHERE user_id IN (
        SELECT id FROM users WHERE user_id_seed = ${userSeed} LIMIT 1
      );
    `;

    return rows.map((v) => ({
      id: v.store_id,
      name: v.name,
      value: "",
      datatype: "text",
      creationDate: new Date(Date.parse(v.created_on)),
      expirationDate: new Date(Date.parse(v.expired_on)),
      permissions: [],
    }));
  } catch (error) {
    return `Database error: failed to get secrets: ${error}`;
  }
}

export async function upsertSecret(userSeed: Uuid, secret: Secret) {
  try {
    await sql`
        INSERT INTO secrets (user_id, store_id, name, created_on, expired_on)
        SELECT id, ${secret.id as Uuid}, ${secret.name}, ${secret.creationDate.toISOString()}, ${secret.expirationDate.toISOString()}
        FROM users
        WHERE user_id_seed = ${userSeed}
        ON CONFLICT (store_id)
        DO UPDATE
        SET
          store_id = ${secret.id as Uuid},
          expired_on = ${secret.expirationDate.toISOString()};
    `;

    for (const perm of secret.permissions) {
      if (perm.read) {
        await sql`
          INSERT INTO permissions (sid, uid_ext, perm_type, granted)
          VALUES (
            ${secret.id as Uuid},
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
            ${secret.id as Uuid},
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
            ${secret.id as Uuid},
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
              ${secret.id as Uuid},
              ${perm.uid},
              'compute',
              ${pid},
              CURRENT_DATE
            ) ON CONFLICT DO NOTHING;
          `;
        }
      }
    }
  } catch (error) {
    return `Database error: failed to upsert secret: ${error}.`
  }
}

export async function delSecret(secret: Secret) {
  try {
    await sql`DELETE FROM secrets WHERE store_id = ${secret.id as Uuid};`
  } catch (error) {
    return `Database error: failed to delete secret: ${error}`
  }
}

// permissions

export async function delPermission(secretId: Uuid, permType: string, userIdExt: string) {
  await sql`DELETE FROM permissions WHERE sid = ${secretId} AND uid_ext = ${userIdExt} AND perm_type =  ${permType};`
}
