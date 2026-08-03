import type {
  EnableBankingPsuHeaderName,
  EnableBankingPsuHeaders,
  RequestHeaders
} from "@/definitions";

const HEADER_MAPPINGS: Array<{
  providerName: EnableBankingPsuHeaderName;
  requestName: string;
}> = [
  { providerName: "Psu-Ip-Address", requestName: "x-forwarded-for" },
  { providerName: "Psu-User-Agent", requestName: "user-agent" },
  { providerName: "Psu-Referer", requestName: "referer" },
  { providerName: "Psu-Accept", requestName: "accept" },
  { providerName: "Psu-Accept-Charset", requestName: "accept-charset" },
  { providerName: "Psu-Accept-Encoding", requestName: "accept-encoding" },
  { providerName: "Psu-Accept-Language", requestName: "accept-language" }
];

const PROVIDER_HEADER_NAMES = new Map(
  HEADER_MAPPINGS.map(({ providerName }) => [
    providerName.toLowerCase(),
    providerName
  ])
);

export function getInteractivePsuHeaders({
  requestHeaders,
  requiredHeaders
}: {
  requestHeaders: RequestHeaders;
  requiredHeaders: string[];
}): EnableBankingPsuHeaders {
  const headers: EnableBankingPsuHeaders = {};

  for (const mapping of HEADER_MAPPINGS) {
    const value = getRequestHeaderValue(requestHeaders, mapping.requestName);

    if (value) {
      headers[mapping.providerName] = value;
    }
  }

  const availableNames = new Set(
    Object.keys(headers).map((name) => name.toLowerCase())
  );
  const hasEveryRequiredHeader = requiredHeaders.every((name) => {
    const canonicalName = PROVIDER_HEADER_NAMES.get(name.toLowerCase());

    return canonicalName && availableNames.has(canonicalName.toLowerCase());
  });

  return hasEveryRequiredHeader ? headers : {};
}

function getRequestHeaderValue(
  requestHeaders: RequestHeaders,
  name: string
): string | null {
  const directValue = requestHeaders.get(name);
  const fallbackValue =
    name === "x-forwarded-for" ? requestHeaders.get("x-real-ip") : null;
  const rawValue = directValue ?? fallbackValue;
  const value =
    name === "x-forwarded-for"
      ? rawValue?.split(",")[0]?.trim()
      : rawValue?.trim();

  return value ? value.slice(0, 500) : null;
}
