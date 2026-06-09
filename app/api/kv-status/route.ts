import { NextResponse } from "next/server";
import {
  getKvRuntimeMode,
  hasKvEnvVars,
  isServerStorageAvailable,
} from "../../lib/kvConfig";

export async function GET(): Promise<NextResponse> {
  const mode = getKvRuntimeMode();
  const serverStorageAvailable = isServerStorageAvailable();

  let message: string;
  if (mode === "remote") {
    message =
      "Upstash Redis に接続しています。作成VOTE・投票・コメントは全ユーザーで共有されます。";
  } else if (mode === "dev-memory") {
    message =
      "開発用インメモリ KV です（サーバー再起動でリセット）。.env.local に Upstash を設定すると永続化できます。";
  } else {
    message =
      "KV が未設定です。本番では Vercel Storage の Redis（Upstash）を設定してください。";
  }

  return NextResponse.json({
    mode,
    configured: hasKvEnvVars(),
    serverStorageAvailable,
    /** 複数端末・複数ユーザー間でデータが共有されるか */
    sharedAcrossDevices: mode === "remote",
    /** 本番で KV 未設定のとき true（端末ローカルのみになる） */
    productionRequiresKv: mode === "unconfigured",
    message,
  });
}
