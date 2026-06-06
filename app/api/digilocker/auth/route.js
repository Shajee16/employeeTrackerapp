import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import crypto from 'crypto';

// GET — Redirect to DigiLocker OAuth authorization
export async function GET(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const CLIENT_ID = process.env.DIGILOCKER_CLIENT_ID;
  const REDIRECT_URI = process.env.DIGILOCKER_REDIRECT_URI || 'http://localhost:3001/api/digilocker/callback';
  const BASE_URL = process.env.DIGILOCKER_BASE_URL || 'https://digilocker.meripehchaan.gov.in/public';

  if (!CLIENT_ID) {
    return NextResponse.redirect(new URL('/dashboard?error=DigiLocker+not+configured', req.url));
  }

  const state = crypto.randomBytes(16).toString('hex');
  const nonce = crypto.randomBytes(16).toString('hex');

  // PKCE
  const code_verifier = crypto.randomBytes(32).toString('base64url');
  const code_challenge = crypto
    .createHash('sha256')
    .update(code_verifier)
    .digest('base64url');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: state,
    scope: 'openid',
    nonce: nonce,
    code_challenge: code_challenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${BASE_URL}/oauth2/1/authorize?${params.toString()}`;

  const cookieOpts = { httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax' };
  const response = NextResponse.redirect(authUrl);
  response.cookies.set('dl_code_verifier', code_verifier, cookieOpts);
  response.cookies.set('dl_state', state, cookieOpts);
  response.cookies.set('dl_nonce', nonce, cookieOpts);

  console.log(`🔗 [DigiLocker] Redirecting user ${session.id} to DigiLocker OAuth...`);

  return response;
}
