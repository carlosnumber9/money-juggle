import "server-only";

import {
  LOGIN_STATUS_MESSAGES,
  type LoginStatusMessage,
  type LoginView
} from "@/definitions";
import { isDemoMode } from "@/lib/demo/mode";

export function getLoginView({ status }: { status?: string }): LoginView {
  return {
    isDemo: isDemoMode(),
    message: getStatusMessage(status)
  };
}

function getStatusMessage(status?: string): LoginStatusMessage | null {
  return status ? (LOGIN_STATUS_MESSAGES[status] ?? null) : null;
}
