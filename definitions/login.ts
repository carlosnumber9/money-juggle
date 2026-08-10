export type LoginStatusMessage = {
  tone: "success" | "error";
  text: string;
};

export type LoginView = {
  message: LoginStatusMessage | null;
};

export const LOGIN_STATUS_MESSAGES: Record<string, LoginStatusMessage> = {
  "missing-email": {
    tone: "error",
    text: "Introduce tu email."
  },
  "missing-password": {
    tone: "error",
    text: "Introduce tu contraseña."
  },
  "allowlist-missing": {
    tone: "error",
    text: "Configura ALLOWED_EMAILS antes de iniciar sesión."
  },
  "not-allowed": {
    tone: "error",
    text: "Este email no está autorizado para acceder a money-juggle."
  },
  "signed-out": {
    tone: "success",
    text: "Has cerrado sesión correctamente."
  },
  "invalid-credentials": {
    tone: "error",
    text: "El email o la contraseña no son correctos."
  },
  "login-rate-limit": {
    tone: "error",
    text: "Se han realizado demasiados intentos. Espera unos minutos y vuelve a intentarlo."
  },
  error: {
    tone: "error",
    text: "No se ha podido iniciar sesión. Vuelve a intentarlo."
  }
};

export type LoginPageProps = {
  searchParams: Promise<{
    status?: string;
  }>;
};
