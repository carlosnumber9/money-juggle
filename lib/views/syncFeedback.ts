import type { ConnectionSyncIssue, SyncFeedback } from "@/definitions";

export function buildSyncFeedback(
  issues: ConnectionSyncIssue[],
  connections: Array<{
    id: string;
    institution?: { name: string } | null;
    institution_name?: string;
  }>
): SyncFeedback[] {
  const feedback = new Map<string, SyncFeedback>();
  for (const issue of issues) {
    const connection = connections.find(
      (candidate) => candidate.id === issue.bankConnectionId
    );
    const bankName =
      connection?.institution?.name ??
      connection?.institution_name ??
      "la entidad bancaria";
    const key = `${bankName}:${issue.resource}:${issue.kind}`;
    const previous = feedback.get(key);
    const retryAt =
      issue.retryAt && Number.isFinite(Date.parse(issue.retryAt))
        ? new Date(issue.retryAt).toISOString()
        : null;
    feedback.set(key, {
      bankName,
      resource: issue.resource,
      kind: issue.kind,
      retryAt:
        previous?.retryAt && (!retryAt || previous.retryAt > retryAt)
          ? previous.retryAt
          : retryAt
    });
  }
  return [...feedback.values()];
}
