import { vi } from "vitest";

type QueryResult = { data: unknown; error: { message: string } | null };

export function createSupabaseQueryMock(
  data: unknown = null,
  error: { message: string } | null = null
) {
  const result: QueryResult = { data, error };
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
    insert: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject)
  };
  for (const method of [
    "select",
    "update",
    "upsert",
    "insert",
    "eq",
    "in",
    "is",
    "or",
    "order",
    "limit"
  ] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}
