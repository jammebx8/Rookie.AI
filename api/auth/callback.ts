import { NextRequest, NextResponse } from 'next/server';

/**
 * This is the OAuth callback handler for Supabase.
 * Supabase redirects here after OAuth, and we redirect back to the frontend with the auth code.
 */
export async function GET(request: NextRequest) {
  // Get the full URL with query params
  const url = request.nextUrl;
  const queryParams = url.searchParams;

  // Build the redirect URL to your frontend callback handler
  // Use the origin from the request or fall back to environment variable
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.VERCEL_PROJECT_PRODUCTION_URL || 
                 url.origin;

  // Ensure appUrl has proper protocol
  const redirectUrl = new URL('/callback', appUrl.startsWith('http') ? appUrl : `https://${appUrl}`);

  // Copy all query parameters (includes code, state, etc.) to the redirect URL
  queryParams.forEach((value, key) => {
    redirectUrl.searchParams.append(key, value);
  });

  console.log('Redirecting to:', redirectUrl.toString());

  return NextResponse.redirect(redirectUrl);
}
