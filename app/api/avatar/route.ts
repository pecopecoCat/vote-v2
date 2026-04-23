import { NextRequest, NextResponse } from "next/server";
import { isSafeAvatarFetchUrl } from "../../lib/avatarProxy";

export const runtime = "nodejs";

const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 12_000;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (raw == null || typeof raw !== "string" || raw.length === 0) {
    return new NextResponse("missing url", { status: 400 });
  }
  if (raw.length > 2048) {
    return new NextResponse("url too long", { status: 400 });
  }
  if (!isSafeAvatarFetchUrl(raw)) {
    return new NextResponse("forbidden url", { status: 403 });
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const upstream = await fetch(raw, {
      method: "GET",
      redirect: "follow",
      signal: ac.signal,
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
        "User-Agent": "VoteAvatarProxy/1.0",
      },
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      return new NextResponse("upstream error", { status: 502 });
    }
    const ct = upstream.headers.get("content-type") ?? "";
    const baseCt = ct.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!baseCt.startsWith("image/")) {
      return new NextResponse("not an image", { status: 415 });
    }
    const buf = await upstream.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) {
      return new NextResponse("invalid size", { status: 413 });
    }

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": baseCt,
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch {
    clearTimeout(timer);
    return new NextResponse("fetch failed", { status: 502 });
  }
}
