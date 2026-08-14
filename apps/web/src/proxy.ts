import { NextResponse, type NextRequest } from "next/server";

const RESERVED_SUBDOMAINS = new Set(["api", "app", "assets", "cdn", "static", "www"]);

function normalizeHost(value: string | null) {
  return (value ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

function appHost() {
  try {
    return normalizeHost(process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : "skaddosh");
  } catch {
    return "skaddosh";
  }
}

function subdomainFor(host: string) {
  const rootHost = appHost();
  if (!host || host === rootHost || !host.endsWith(`.${rootHost}`)) return "";
  const subdomain = host.slice(0, -(rootHost.length + 1)).split(".")[0] ?? "";
  return RESERVED_SUBDOMAINS.has(subdomain) ? "" : subdomain;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml")
  ) {
    return NextResponse.next();
  }

  const username = subdomainFor(normalizeHost(request.headers.get("host")));
  if (!username) return NextResponse.next();

  const url = request.nextUrl.clone();
  const nestedPath = pathname === "/" ? "" : pathname;
  url.pathname = `/portfolio/${username}${nestedPath}`;
  return NextResponse.rewrite(url);
}

