import "server-only";

import type { EnableBankingPsuHeaders, RequestHeaders } from "@/definitions";
import { ENABLE_BANKING_PROVIDER } from "@/definitions";
import { getEnableBankingAspsps } from "@/lib/enableBanking/client";
import { getInteractivePsuHeaders } from "@/lib/enableBanking/client/psuHeaders";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/serviceRole";

type StoredConnectionPsuSettings = {
  id: string;
  user_id: string;
  provider_metadata: unknown;
  institutions:
    | { name: string; country: string | null }
    | Array<{ name: string; country: string | null }>
    | null;
};

export async function getInteractivePsuHeadersByConnection({
  userId,
  bankConnectionIds,
  requestHeaders
}: {
  userId: string;
  bankConnectionIds: ReadonlySet<string>;
  requestHeaders: RequestHeaders;
}): Promise<ReadonlyMap<string, EnableBankingPsuHeaders>> {
  if (bankConnectionIds.size === 0) {
    return new Map();
  }

  const connections = await loadConnectionPsuSettings({
    userId,
    bankConnectionIds
  });
  const requirementsByConnectionId = await resolveRequirements(connections);

  return new Map(
    connections.map((connection) => [
      connection.id,
      getInteractivePsuHeaders({
        requestHeaders,
        requiredHeaders: requirementsByConnectionId.get(connection.id) ?? []
      })
    ])
  );
}

async function loadConnectionPsuSettings({
  userId,
  bankConnectionIds
}: {
  userId: string;
  bankConnectionIds: ReadonlySet<string>;
}): Promise<StoredConnectionPsuSettings[]> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("bank_connections")
    .select("id,user_id,provider_metadata,institutions(name,country)")
    .eq("user_id", userId)
    .eq("provider", ENABLE_BANKING_PROVIDER)
    .in("id", [...bankConnectionIds]);

  if (error) {
    throw new Error(`Could not load PSU header settings: ${error.message}`);
  }

  return data ?? [];
}

async function resolveRequirements(
  connections: StoredConnectionPsuSettings[]
): Promise<Map<string, string[]>> {
  const requirements = new Map<string, string[]>();
  const missingConnections = connections.filter((connection) => {
    const stored = getStoredRequiredHeaders(connection.provider_metadata);

    if (stored) {
      requirements.set(connection.id, stored);
      return false;
    }

    return true;
  });
  const countries = new Set(
    missingConnections
      .map((connection) => getInstitution(connection)?.country)
      .filter((country): country is string => Boolean(country))
  );
  const aspspsByCountry = new Map<
    string,
    Awaited<ReturnType<typeof getEnableBankingAspsps>>
  >();

  for (const country of countries) {
    try {
      aspspsByCountry.set(
        country,
        await getEnableBankingAspsps({
          country,
          psuType: "personal",
          service: "AIS"
        })
      );
    } catch (error) {
      console.error("Could not resolve ASPSP PSU header requirements", {
        country,
        message: error instanceof Error ? error.message : "Unknown error."
      });
    }
  }

  for (const connection of missingConnections) {
    const institution = getInstitution(connection);
    const aspsp = institution?.country
      ? aspspsByCountry
          .get(institution.country)
          ?.find((candidate) => candidate.name === institution.name)
      : undefined;
    const requiredHeaders = aspsp?.required_psu_headers;

    if (requiredHeaders) {
      requirements.set(connection.id, requiredHeaders);
      await persistRequiredHeaders(connection, requiredHeaders);
    } else {
      requirements.set(connection.id, ["unresolved-provider-requirement"]);
    }
  }

  return requirements;
}

function getStoredRequiredHeaders(value: unknown): string[] | null {
  const metadata = getRecord(value);
  const aspsp = getRecord(metadata.aspsp);
  const requiredHeaders = aspsp.required_psu_headers;

  return Array.isArray(requiredHeaders) &&
    requiredHeaders.every((header) => typeof header === "string")
    ? requiredHeaders
    : null;
}

function getInstitution(connection: StoredConnectionPsuSettings) {
  return Array.isArray(connection.institutions)
    ? connection.institutions[0]
    : connection.institutions;
}

async function persistRequiredHeaders(
  connection: StoredConnectionPsuSettings,
  requiredHeaders: string[]
) {
  const metadata = getRecord(connection.provider_metadata);
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("bank_connections")
    .update({
      provider_metadata: {
        ...metadata,
        aspsp: {
          ...getRecord(metadata.aspsp),
          required_psu_headers: requiredHeaders
        }
      }
    })
    .eq("id", connection.id)
    .eq("user_id", connection.user_id);

  if (error) {
    throw new Error(`Could not persist PSU header settings: ${error.message}`);
  }
}

function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
