"use client";

import { useEffect, useState } from "react";
import { getAuth, getAuthUpdatedEventName } from "../data/auth";
import { MOCK_ANNOUNCEMENTS } from "../data/notifications";
import {
  ANNOUNCEMENTS_READ_STATE_EVENT,
  hasUnreadAnnouncements,
} from "../data/announcementReadState";

export function useMainNavState() {
  const [userIconUrl, setUserIconUrl] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [announcementUnread, setAnnouncementUnread] = useState(false);

  useEffect(() => {
    const update = () => {
      const auth = getAuth();
      setIsLoggedIn(auth.isLoggedIn);
      setUserIconUrl(auth.isLoggedIn && auth.user?.iconUrl ? auth.user.iconUrl : null);
    };
    update();
    window.addEventListener(getAuthUpdatedEventName(), update);
    return () => window.removeEventListener(getAuthUpdatedEventName(), update);
  }, []);

  useEffect(() => {
    const sync = () => setAnnouncementUnread(hasUnreadAnnouncements(MOCK_ANNOUNCEMENTS));
    sync();
    window.addEventListener(ANNOUNCEMENTS_READ_STATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ANNOUNCEMENTS_READ_STATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { userIconUrl, isLoggedIn, announcementUnread };
}
