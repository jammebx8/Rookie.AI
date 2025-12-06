import { NextRequest, NextResponse } from 'next/server';

/**
 * This is a simple redirect handler for OAuth callbacks.
 * Supabase redirects here after OAuth, and we redirect back to the frontend callback handler.
 */
export async function GET(request: NextRequest) {
  // Get the full URL with query params
  const url = request.nextUrl;
  const queryParams = url.searchParams;

  // Build the redirect URL to your frontend callback handler
  // This forwards the OAuth code/token to your React component
  const redirectUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL || url.origin);

  // Copy all query parameters to the redirect URL
  queryParams.forEach((value, key) => {
    redirectUrl.searchParams.append(key, value);
  });

  return NextResponse.redirect(redirectUrl);
}
