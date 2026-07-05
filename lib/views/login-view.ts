import "server-only";

import { isDemoMode } from "@/lib/demo/mode";

export type LoginView = {
  isDemo: boolean;
  message: {
    tone: "success" | "error";
    text: string;
  } | null;
};

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

function getStatusMessage(status?: string, email?: string) {
  if (status === "sent") {
    return {
      tone: "success",
      text: email
        ? `Te hemos enviado un enlace mágico a ${email}.`
        : "Te hemos enviado un enlace mágico."
    } as const;
  }

  if (status === "missing-email") {
    return {
      tone: "error",
      text: "Introduce tu email para recibir el enlace mágico."
    } as const;
  }

  if (status === "allowlist-missing") {
    return {
      tone: "error",
      text: "Configura ALLOWED_EMAILS en .env.local antes de pedir enlaces mágicos."
    } as const;
  }

  if (status === "not-allowed") {
    return {
      tone: "error",
      text: "Este email no está autorizado para acceder a money-juggle."
    } as const;
  }

  if (status === "signed-out") {
    return {
      tone: "success",
      text: "Has cerrado sesión correctamente."
    } as const;
  }

  if (status === "callback-error") {
    return {
      tone: "error",
      text: "El enlace no se ha podido validar. Pide un enlace nuevo e inténtalo de nuevo."
    } as const;
  }

  if (status === "email-rate-limit") {
    return {
      tone: "error",
      text: "Supabase ha limitado temporalmente el envío de emails con su SMTP por defecto. Espera unos minutos o configura un proveedor SMTP propio."
    } as const;
  }

  if (status === "error") {
    return {
      tone: "error",
      text: "No se ha podido enviar el enlace. Revisa que el usuario exista en Supabase y vuelve a intentarlo."
    } as const;
  }

  return null;
}
