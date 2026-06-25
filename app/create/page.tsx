"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import CreateQuestionStep from "./CreateQuestionStep";
import { getAuth } from "../data/auth";

export default function CreateQuestionPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getAuth().isLoggedIn) {
      router.replace("/profile?returnTo=" + encodeURIComponent("/create"));
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      <AppHeader type="title" title="質問を入力" />
      <CreateQuestionStep
        onDecide={(q) => {
          const params = new URLSearchParams({ q });
          router.push(`/create/form?${params.toString()}`);
        }}
      />
    </div>
  );
}
