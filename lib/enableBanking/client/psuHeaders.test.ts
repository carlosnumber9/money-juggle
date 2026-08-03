import { describe, expect, it } from "vitest";

import { getInteractivePsuHeaders } from "./psuHeaders";

function getHeaders(values: Record<string, string>) {
  const headers = new Headers(values);

  return { get: headers.get.bind(headers) };
}

describe("getInteractivePsuHeaders", () => {
  it("maps available browser context after satisfying the ASPSP requirements", () => {
    expect(
      getInteractivePsuHeaders({
        requestHeaders: getHeaders({
          "x-forwarded-for": "203.0.113.4, 10.0.0.1",
          "user-agent": "Money Juggle Browser",
          accept: "application/json",
          "accept-language": "es-ES"
        }),
        requiredHeaders: ["Psu-Ip-Address"]
      })
    ).toEqual({
      "Psu-Ip-Address": "203.0.113.4",
      "Psu-User-Agent": "Money Juggle Browser",
      "Psu-Accept": "application/json",
      "Psu-Accept-Language": "es-ES"
    });
  });

  it("sends no PSU headers when a required value is unavailable", () => {
    expect(
      getInteractivePsuHeaders({
        requestHeaders: getHeaders({ "user-agent": "Browser" }),
        requiredHeaders: ["Psu-Ip-Address"]
      })
    ).toEqual({});
  });

  it("sends no PSU headers for an unsupported provider requirement", () => {
    expect(
      getInteractivePsuHeaders({
        requestHeaders: getHeaders({ "x-forwarded-for": "203.0.113.4" }),
        requiredHeaders: ["Psu-Geo-Location"]
      })
    ).toEqual({});
  });
});
