export type PrivateLayoutView =
  | {
      kind: "unauthenticated";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "authenticated";
      user: {
        email: string | null;
      };
    };
