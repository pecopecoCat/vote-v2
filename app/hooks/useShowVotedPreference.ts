"use client";

import { useCallback, useState } from "react";
import { getShowVoted, setShowVoted } from "../data/showVotedPreference";

export function useShowVotedPreference(): {
  showVoted: boolean;
  handleShowVotedChange: (value: boolean) => void;
} {
  const [showVoted, setShowVotedState] = useState(() => getShowVoted());
  const handleShowVotedChange = useCallback((value: boolean) => {
    setShowVoted(value);
    setShowVotedState(value);
  }, []);
  return { showVoted, handleShowVotedChange };
}
