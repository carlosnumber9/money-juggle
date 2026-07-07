export type PrivateLayoutView =
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "authenticated";
      isDemo: boolean;
      user: {
        email: string | null;
      };
    };
