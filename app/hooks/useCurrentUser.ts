"use client";

import { useMemo } from "react";
import type { CurrentUser } from "../components/VoteCard";
import type { AuthState } from "../data/auth";

export function useCurrentUser(auth: AuthState): CurrentUser {
  return useMemo(
    () =>
      auth.isLoggedIn && auth.user
        ? { type: "sns", name: auth.user.name, iconUrl: auth.user.iconUrl }
        : { type: "guest" },
    [auth.isLoggedIn, auth.user]
  );
}
