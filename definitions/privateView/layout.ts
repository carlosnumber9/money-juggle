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
        id: string;
        email: string | null;
      };
    };
