export const REPORT_PAGE_SIZE = 500;

export async function readReportPages<T>(
  getPage: (offset: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += REPORT_PAGE_SIZE) {
    const { data, error } = await getPage(offset);
    if (error) {
      throw new Error(`Could not read monthly report data: ${error.message}`);
    }
    if (!data) {
      throw new Error("Monthly report query returned no data.");
    }
    rows.push(...data);
    if (data.length < REPORT_PAGE_SIZE) return rows;
  }
}
