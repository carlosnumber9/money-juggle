import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";

import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

import {
  getAllowedEmails,
  isEmailAllowed,
  normalizeEmail
} from "@/lib/auth/allowlist";
import { getMonthlyReportData } from "@/lib/db/monthlyReportData";
import { buildMonthlyExportReport } from "@/lib/reports/monthlyExport/buildReport";
import {
  getDefaultExportMonth,
  getExportPeriod
} from "@/lib/reports/monthlyExport/period";
import { writeMonthlyWorkbook } from "@/lib/reports/monthlyExport/writeWorkbook";
import { getSupabaseConfig } from "@/lib/supabase/env";

export class MonthlyReportCommandError extends Error {}

const HELP = `Genera el mismo Excel mensual que la app, sin iniciar Next.js.

Uso: npm run report:monthly -- --month YYYY-MM
Sin --month, genera el mes anterior en Europe/Madrid.

Lee la configuración local de Next.js, incluida .env.local.
REPORT_EMAIL: email permitido (opcional si hay un único email permitido).
REPORT_PASSWORD: contraseña del usuario de Supabase Auth.
Salida: reports/Finanzas-YYYY-MM-<fecha UTC>-<identificador>.xlsx
Lee datos guardados; no sincroniza bancos.`;

export function parseMonthlyReportArguments(args: string[], now = new Date()) {
  let values;
  try {
    ({ values } = parseArgs({
      args,
      options: {
        month: { type: "string" },
        help: { type: "boolean", short: "h" }
      },
      allowPositionals: false,
      strict: true
    }));
  } catch {
    throw new MonthlyReportCommandError(
      "Argumentos no válidos. Usa npm run report:monthly -- --month YYYY-MM o --help."
    );
  }
  if (values.help) return null;
  const month = values.month ?? getDefaultExportMonth(now);
  const period = getExportPeriod(month, now);
  if (!period) {
    throw new MonthlyReportCommandError(
      "Mes no válido. Usa YYYY-MM; no se permiten meses futuros."
    );
  }
  return period;
}

export async function runMonthlyReport(
  args = process.argv.slice(2),
  projectDirectory = process.cwd(),
  generatedAt = new Date()
): Promise<string | null> {
  const period = parseMonthlyReportArguments(args, generatedAt);
  if (!period) {
    console.log(HELP);
    return null;
  }
  loadEnvConfig(projectDirectory, true, { info() {}, error() {} });

  const allowedEmails = getAllowedEmails();
  const email = normalizeEmail(
    process.env.REPORT_EMAIL ??
      (allowedEmails.length === 1 ? allowedEmails[0] : "")
  );
  if (!email || !isEmailAllowed(email)) {
    throw new MonthlyReportCommandError(
      "Configura REPORT_EMAIL con un email incluido en ALLOWED_EMAILS u OWNER_EMAIL."
    );
  }
  const password = process.env.REPORT_PASSWORD;
  if (!password) {
    throw new MonthlyReportCommandError(
      "Falta REPORT_PASSWORD. Configúrala en el entorno o en .env.local para autenticar el usuario de Supabase."
    );
  }
  let config;
  try {
    config = getSupabaseConfig();
  } catch {
    throw new MonthlyReportCommandError(
      "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  const supabase = createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error || !data.user || !data.session) {
      throw new MonthlyReportCommandError(
        "No se pudo iniciar sesión en Supabase. Comprueba las credenciales y la conexión."
      );
    }
    if (!isEmailAllowed(data.user.email)) {
      throw new MonthlyReportCommandError(
        "El usuario autenticado no tiene permiso para generar informes."
      );
    }

    const dataForReport = await getMonthlyReportData(
      data.user.id,
      period.range,
      supabase
    );
    const report = buildMonthlyExportReport(
      dataForReport,
      period.value,
      generatedAt
    );
    const workbook = await writeMonthlyWorkbook(report);
    const directory = resolve(projectDirectory, "reports");
    const timestamp = generatedAt.toISOString().replace(/[:.]/g, "-");
    const path = resolve(
      directory,
      `Finanzas-${period.value}-${timestamp}-${randomUUID()}.xlsx`
    );
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(path, workbook, { flag: "wx", mode: 0o600 });
    console.log(`Informe generado: ${path}`);
    return path;
  } finally {
    // Revoke only this command's session; leave browser sessions active.
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  }
}
