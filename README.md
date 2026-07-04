# money-juggle

A very custom finance tracker for my own accounts.

## Development

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Then fill the Supabase values in `.env.local`.

Configure the allowed login emails as a comma-separated list:

```bash
ALLOWED_EMAILS=owner@example.com
```

The owner user must already exist in Supabase Auth because the app disables
public self-registration for magic links.

Start the local Next.js app:

```bash
npm run dev
```

Run the basic checks:

```bash
npm run check
```

Or run them separately:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Format files:

```bash
npm run format
```
