import { auth0 } from "./lib/auth0";

/**
 * Auth0 proxy — required by @auth0/nextjs-auth0 v4 on Next.js 16.
 * Handles /auth/login, /auth/logout, /auth/callback, /auth/profile, etc.
 */
export async function proxy(request: Request) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
