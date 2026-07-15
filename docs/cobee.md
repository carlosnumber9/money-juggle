# Cobee By Pluxee

Cobee by Pluxee is a future candidate integration for restaurant and flexible
compensation spending that does not come from PSD2 bank Account Information.

Source reviewed on 2026-07-15:

- `https://docs.api.cobee.io/en/api-reference/api_introduction`
- `https://docs.api.cobee.io/en/api-reference/authentication`
- `https://docs.api.cobee.io/en/api-reference/authentication/endpoint/post_authenticate`
- `https://docs.api.cobee.io/en/api-reference/companies/endpoint/get_companies`
- `https://docs.api.cobee.io/en/api-reference/employees/endpoint/get_employees`
- `https://docs.api.cobee.io/en/api-reference/consumptions/endpoint/get_employee_consumptions`

## Current Understanding

The public API uses application credentials:

- Obtain `clientId` and `clientSecret` through Cobee / Pluxee customer success.
- Call `POST /oauth/token` with those credentials.
- Receive a Bearer JWT access token with an expiration.
- Use that token in the `Authorization` header for later API calls.

The documentation shows sandbox and production base URLs:

- `https://pre-public-api.cobee.io/api/v3`
- `https://public-api.cobee.io/api/v3`

The likely read path for `money-juggle` is:

1. Authenticate with Cobee server-side.
2. List available companies with `GET /companies`.
3. Identify the relevant employee with `GET /companies/{companyId}/employees`.
4. Read consumption reports with
   `GET /companies/{companyId}/employees/{employeeId}/consumptions`.

The consumptions endpoint is documented as returning confirmed transactions for
a specific employee and payroll cycle. By default it returns the current open
payroll cycle; older cycles can be requested through the documented payroll
property. Responses can be JSON or CSV, and can be shaped with category and
grouping options.

Relevant fields in the example consumption response include:

- Company ID, legal ID, currency, and payroll cycle.
- Employee ID, internal ID, and legal ID.
- Consumption category, such as `meal-benefit`.
- Behaviour, such as `flex`.
- Sum type, such as `expenses` or `withdrawn`.
- Amount in cents.

## Product Fit

Cobee should be treated as external benefit consumption data, not as a bank
connection.

Useful first questions:

- Can the owner obtain API credentials for personal use through their Cobee by
  Pluxee account or employer relationship?
- Does the API expose only payroll-cycle aggregates, or can it expose the
  per-purchase detail needed for transaction-level reconciliation?
- Are restaurant consumptions available with dates and merchants, or only by
  category and payroll cycle?
- Does the API agreement allow this personal reporting use case?

## Proposed First Scope

Do not build the integration until credentials and allowed use are confirmed.

When ready, the smallest useful slice should be read-only:

- Add server-only Cobee configuration documentation.
- Add a narrow server-only client for token acquisition and one harmless read.
- Store no Cobee credentials in the browser.
- Normalize only the fields needed for a personal report.
- Keep Cobee rows owned by `user_id` and protected by RLS.

## Non-Goals

- Do not use Cobee as a PSD2 provider.
- Do not mix Cobee connections into Enable Banking connection lifecycle tables.
- Do not implement employee creation, invitation, blocking, migration, payroll
  cycle closing, or benefit administration.
- Do not expose Cobee tokens or raw API payloads to client components.

## Open Modeling Question

If Cobee exposes transaction-level restaurant purchases, the app may eventually
reconcile them with bank movements. If it only exposes payroll-cycle aggregates,
the first report should present Cobee consumption alongside bank spending rather
than trying to match it to individual transactions.
