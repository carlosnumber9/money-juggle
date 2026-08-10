import "server-only";

import {
  LOGIN_STATUS_MESSAGES,
  type LoginStatusMessage,
  type LoginView
} from "@/definitions";

export function getLoginView({ status }: { status?: string }): LoginView {
  return {
    message: getStatusMessage(status)
  };
}

function getStatusMessage(status?: string): LoginStatusMessage | null {
  return status ? (LOGIN_STATUS_MESSAGES[status] ?? null) : null;
}
