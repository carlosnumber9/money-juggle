export function getEnableBankingInstitutionProviderId({
  country,
  name
}: {
  country: string;
  name: string;
}): string {
  return `${country}:${name}`;
}
