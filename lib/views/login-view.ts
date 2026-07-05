import "server-only";

import {
  LOGIN_STATUS_MESSAGES,
  type LoginStatusMessage,
  type LoginView
} from "@/definitions";
import { isDemoMode } from "@/lib/demo/mode";

export function getLoginView({
  email,
  status
}: {
  email?: string;
  status?: string;
}): LoginView {
  return {
    isDemo: isDemoMode(),
    message: getStatusMessage(status, email)
  };
}

function getStatusMessage(
  status?: string,
  email?: string
): LoginStatusMessage | null {
  if (status === "sent") {
    return {
      tone: "success",
      text: email
        ? `Te hemos enviado un enlace mágico a ${email}.`
        : "Te hemos enviado un enlace mágico."
    };
  }

  return status ? (LOGIN_STATUS_MESSAGES[status] ?? null) : null;
}
