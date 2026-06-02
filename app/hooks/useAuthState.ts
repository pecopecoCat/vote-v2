"use client";

import { useState } from "react";
import { getAuth, getAuthUpdatedEventName, type AuthState } from "../data/auth";
import { useWindowCustomEvent } from "./useWindowCustomEvent";

export function useAuthState(): AuthState {
  const [auth, setAuth] = useState(() => getAuth());
  useWindowCustomEvent(getAuthUpdatedEventName(), () => setAuth(getAuth()));
  return auth;
}
