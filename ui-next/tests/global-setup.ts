import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_STORAGE = 'tests/.auth/user.json';

export default async function globalSetup(config: FullConfig) {
  const projectUse = config.projects?.[0]?.use as { baseURL?: string } | undefined;
  const baseURL = projectUse?.baseURL || process.env.BASE_URL || 'http://localhost:3000';
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Ensure auth storage directory exists
  const authDir = path.dirname(AUTH_STORAGE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  try {
    // Test credentials (must match what's in auth.ts fixture)
    const email = process.env.TEST_EMAIL || 'test@example.com';
    const password = process.env.TEST_PASSWORD || 'Test@1234';

    if (!process.env.TEST_EMAIL || !process.env.TEST_PASSWORD) {
      throw new Error('TEST_EMAIL / TEST_PASSWORD are not loaded. Ensure .env.test is present and readable.');
    }

    const csrfResponse = await context.request.get(`${baseURL}/api/auth/csrf`);
    if (!csrfResponse.ok()) {
      throw new Error(`Unable to fetch CSRF token: ${csrfResponse.status()} ${await csrfResponse.text()}`);
    }
    const csrfPayload = (await csrfResponse.json()) as { csrfToken?: string };
    const csrfToken = csrfPayload.csrfToken;
    if (!csrfToken) {
      throw new Error('CSRF token missing from /api/auth/csrf response');
    }

    // NextAuth credentials flow expects form payload on callback endpoint.
    const response = await context.request.post(`${baseURL}/api/auth/callback/credentials`, {
      form: {
        csrfToken,
        email,
        password,
        redirect: 'false',
        callbackUrl: `${baseURL}/`,
        json: 'true',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok()) {
      throw new Error(`Authentication failed: ${response.status()} ${await response.text()}`);
    }

    // Get auth cookies
    const cookies = await context.cookies();
    const authCookie = cookies.find(
      (c) =>
        c.name === 'next-auth.session-token' ||
        c.name === '__Secure-next-auth.session-token' ||
        c.name === 'authjs.session-token' ||
        c.name === '__Secure-authjs.session-token',
    );

    if (!authCookie) {
      throw new Error('No session cookie found after login');
    }

    // Save auth state for reuse
    const authState = {
      cookies: cookies,
      origins: [{ origin: new URL(baseURL).origin, localStorage: [] }],
      sessionCookieName: authCookie.name,
      sessionToken: authCookie.value,
    };

    fs.writeFileSync(AUTH_STORAGE, JSON.stringify(authState, null, 2));

    console.log(`✓ Global setup: Authentication successful. Token saved to ${AUTH_STORAGE}`);
  } catch (error) {
    console.error('✗ Global setup: Authentication failed', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}
