"use client";

import { useEffect, useState } from "react";
import CreateVoteModalShell from "../../components/CreateVoteModalShell";
import CreateVoteFormContentWithSuspense from "./CreateVoteFormContent";

const DESKTOP_MQ = "(min-width: 768px)";

/**
 * SP: フルページの作成フォーム
 * PC: クライアント遷移時は @modal インターセプトが HOME 等の上に被せる。
 *     URL直打ち・リロード時のみ standalone モーダルを表示。
 */
export default function CreateFormPage() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  if (isDesktop === null) {
    return null;
  }

  if (isDesktop) {
    return <CreateVoteModalShell mode="standalone" />;
  }

  return <CreateVoteFormContentWithSuspense variant="page" />;
}
