import { getEnableBankingInstitutionProviderId } from "@/lib/db/enable-banking-connections";
import { getEnableBankingAspsps } from "@/lib/enable-banking/client";

export async function findAspsp({
  name,
  country
}: {
  name: string;
  country: string;
}) {
  const aspsps = await getEnableBankingAspsps({
    country,
    psuType: "personal",
    service: "AIS"
  });
  const providerId = getEnableBankingInstitutionProviderId({ name, country });
  const aspsp = aspsps.find(
    (candidate) =>
      getEnableBankingInstitutionProviderId(candidate) === providerId
  );

  if (!aspsp) {
    throw new Error("Unsupported ASPSP.");
  }

  return aspsp;
}
