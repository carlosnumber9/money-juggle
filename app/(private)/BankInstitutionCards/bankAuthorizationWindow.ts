export const BANK_AUTHORIZATION_WINDOW_NAME = "money-juggle-bank-authorization";
export const BANK_AUTHORIZATION_STARTED_EVENT =
  "money-juggle:bank-authorization-started";

type StandaloneWindow = Pick<Window, "matchMedia" | "navigator">;

export function isStandaloneWebApp(target: StandaloneWindow = window): boolean {
  const navigatorWithStandalone = target.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    target.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true
  );
}

export function prepareBankAuthorizationWindow(
  form: HTMLFormElement,
  target: Pick<Window, "matchMedia" | "navigator" | "open"> = window
): boolean {
  form.removeAttribute("target");

  if (!isStandaloneWebApp(target)) {
    return false;
  }

  const authorizationWindow = target.open("", BANK_AUTHORIZATION_WINDOW_NAME);

  if (!authorizationWindow) {
    return false;
  }

  authorizationWindow.opener = null;
  form.target = BANK_AUTHORIZATION_WINDOW_NAME;

  return true;
}
