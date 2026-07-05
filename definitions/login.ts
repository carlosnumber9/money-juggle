export type LoginStatusMessage = {
  tone: "success" | "error";
  text: string;
};

export type LoginView = {
  isDemo: boolean;
  message: LoginStatusMessage | null;
};

export const LOGIN_STATUS_MESSAGES: Record<string, LoginStatusMessage> = {
  "missing-email": {
    tone: "error",
    text: "Introduce tu email para recibir el enlace mágico."
  },
  "allowlist-missing": {
    tone: "error",
    text: "Configura ALLOWED_EMAILS en .env.local antes de pedir enlaces mágicos."
  },
  "not-allowed": {
    tone: "error",
    text: "Este email no está autorizado para acceder a money-juggle."
  },
  "signed-out": {
    tone: "success",
    text: "Has cerrado sesión correctamente."
  },
  "callback-error": {
    tone: "error",
    text: "El enlace no se ha podido validar. Pide un enlace nuevo e inténtalo de nuevo."
  },
  "email-rate-limit": {
    tone: "error",
    text: "Supabase ha limitado temporalmente el envío de emails con su SMTP por defecto. Espera unos minutos o configura un proveedor SMTP propio."
  },
  error: {
    tone: "error",
    text: "No se ha podido enviar el enlace. Revisa que el usuario exista en Supabase y vuelve a intentarlo."
  }
};

export type LoginPageProps = {
  searchParams: Promise<{
    email?: string;
    status?: string;
  }>;
};
