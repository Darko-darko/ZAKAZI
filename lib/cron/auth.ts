import { NextResponse } from "next/server";

function normalizeSecret(value: string | undefined | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getBearerToken(authorization: string | null) {
  const normalized = normalizeSecret(authorization);

  if (!normalized.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return normalizeSecret(normalized.slice("bearer ".length));
}

export function authorizeCronRequest(request: Request) {
  const cronSecret = normalizeSecret(process.env.CRON_SECRET);
  const authorization = request.headers.get("authorization");

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET nije konfigurisan." },
      { status: 500 },
    );
  }

  if (getBearerToken(authorization) !== cronSecret) {
    return NextResponse.json({ error: "Nedozvoljen pristup." }, { status: 401 });
  }

  return null;
}
