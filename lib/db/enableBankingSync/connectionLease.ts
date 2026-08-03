import "server-only";

import { randomUUID } from "node:crypto";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

import { getSyncLeaseUntil } from "./leaseValue";

type ConnectionLease = {
  bankConnectionId: string;
  token: string;
};

export async function withConnectionSyncLeases<T>({
  userId,
  bankConnectionIds,
  run
}: {
  userId: string;
  bankConnectionIds: string[];
  run: (acquiredConnectionIds: ReadonlySet<string>) => Promise<T>;
}): Promise<{
  value: T;
  acquiredConnectionCount: number;
  busyConnectionCount: number;
}> {
  const uniqueConnectionIds = [...new Set(bankConnectionIds)].sort();
  const leases: ConnectionLease[] = [];

  try {
    for (const bankConnectionId of uniqueConnectionIds) {
      const lease = await tryAcquireConnectionSyncLease({
        userId,
        bankConnectionId
      });

      if (lease) {
        leases.push(lease);
      }
    }

    const value = await run(
      new Set(leases.map((lease) => lease.bankConnectionId))
    );

    return {
      value,
      acquiredConnectionCount: leases.length,
      busyConnectionCount: uniqueConnectionIds.length - leases.length
    };
  } finally {
    await Promise.all(
      leases.map((lease) => releaseConnectionSyncLease({ userId, lease }))
    );
  }
}

async function tryAcquireConnectionSyncLease({
  userId,
  bankConnectionId,
  now = new Date()
}: {
  userId: string;
  bankConnectionId: string;
  now?: Date;
}): Promise<ConnectionLease | null> {
  const token = randomUUID();
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .update({
      sync_lease_token: token,
      sync_lease_until: getSyncLeaseUntil(now)
    })
    .eq("id", bankConnectionId)
    .eq("user_id", userId)
    .or(`sync_lease_until.is.null,sync_lease_until.lt.${now.toISOString()}`)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(
      `Could not acquire connection sync lease: ${error.message}`
    );
  }

  return data ? { bankConnectionId, token } : null;
}

async function releaseConnectionSyncLease({
  userId,
  lease
}: {
  userId: string;
  lease: ConnectionLease;
}) {
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("bank_connections")
    .update({ sync_lease_token: null, sync_lease_until: null })
    .eq("id", lease.bankConnectionId)
    .eq("user_id", userId)
    .eq("sync_lease_token", lease.token);

  if (error) {
    console.error("Could not release connection sync lease", {
      bank_connection_id: lease.bankConnectionId,
      message: error.message
    });
  }
}
