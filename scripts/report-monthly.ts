import { MonthlyReportCommandError, runMonthlyReport } from "./monthlyReport";

runMonthlyReport().catch((error: unknown) => {
  console.error(
    error instanceof MonthlyReportCommandError
      ? error.message
      : "No se pudo generar el informe mensual. Comprueba la conexión, los permisos y los datos guardados."
  );
  process.exitCode = 1;
});
