import { describe, expect, it, vi } from "vitest";

import {
  BANK_AUTHORIZATION_WINDOW_NAME,
  isStandaloneWebApp,
  prepareBankAuthorizationWindow
} from "./bankAuthorizationWindow";

describe("bank authorization window", () => {
  it("detects manifest and legacy iOS standalone display modes", () => {
    expect(isStandaloneWebApp(createWindow({ displayMode: true }))).toBe(true);
    expect(
      isStandaloneWebApp(createWindow({ navigatorStandalone: true }))
    ).toBe(true);
    expect(isStandaloneWebApp(createWindow({}))).toBe(false);
  });

  it("opens a named authorization window for an installed web app", () => {
    const authorizationWindow = { opener: {} } as Window;
    const target = createWindow({
      displayMode: true,
      open: vi.fn(() => authorizationWindow)
    });
    const form = createForm();

    expect(prepareBankAuthorizationWindow(form, target)).toBe(true);
    expect(target.open).toHaveBeenCalledWith(
      "",
      BANK_AUTHORIZATION_WINDOW_NAME
    );
    expect(authorizationWindow.opener).toBeNull();
    expect(form.target).toBe(BANK_AUTHORIZATION_WINDOW_NAME);
  });

  it("keeps same-window navigation outside standalone mode or when blocked", () => {
    const browserForm = createForm();
    const blockedForm = createForm();

    expect(prepareBankAuthorizationWindow(browserForm, createWindow({}))).toBe(
      false
    );
    expect(browserForm.target).toBe("");

    expect(
      prepareBankAuthorizationWindow(
        blockedForm,
        createWindow({ displayMode: true, open: vi.fn(() => null) })
      )
    ).toBe(false);
    expect(blockedForm.target).toBe("");
  });
});

function createWindow({
  displayMode = false,
  navigatorStandalone = false,
  open = vi.fn(() => null)
}: {
  displayMode?: boolean;
  navigatorStandalone?: boolean;
  open?: ReturnType<typeof vi.fn>;
}): Pick<Window, "matchMedia" | "navigator" | "open"> {
  return {
    matchMedia: vi.fn(
      () => ({ matches: displayMode }) as MediaQueryList
    ) as Window["matchMedia"],
    navigator: { standalone: navigatorStandalone } as Navigator & {
      standalone?: boolean;
    },
    open: open as Window["open"]
  };
}

function createForm(): HTMLFormElement {
  return {
    target: "old-target",
    removeAttribute(name: string) {
      if (name === "target") {
        this.target = "";
      }
    }
  } as HTMLFormElement;
}
