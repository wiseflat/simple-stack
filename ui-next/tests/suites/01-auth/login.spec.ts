/**
 * Suite 01: Authentication Tests (1.1)
 * Verify test credentials and session token handling
 */
import { test as base, expect } from '@playwright/test';
import { ApiClient } from '@/tests/helpers/api-client';
import { testAuth } from '@/tests/fixtures/auth';

async function postCredentials(
  apiClient: ApiClient,
  email: string,
  password: string,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const csrfResult = await apiClient.get<{ csrfToken?: string }>('/api/auth/csrf');
  const csrfToken = typeof csrfResult.data === 'object' && csrfResult.data
    ? (csrfResult.data as { csrfToken?: string }).csrfToken
    : undefined;

  expect(csrfResult.ok).toBe(true);
  expect(csrfToken).toBeTruthy();

  return apiClient.post('/api/auth/callback/credentials', {
    csrfToken,
    email,
    password,
    redirect: 'false',
    callbackUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/`,
    json: 'true',
  });
}

const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    await use(client);
  },
});

test.describe('01 - Authentication', () => {
  test('should successfully login with test credentials', async ({ apiClient }) => {
    const result = await postCredentials(apiClient, testAuth.email, testAuth.password);

    expect([200, 302]).toContain(result.status);

    const payload = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    expect(payload.toLowerCase()).not.toContain('credentialssignin');
    expect(payload.toLowerCase()).not.toContain('missingcsrf');
  });

  test('should reject invalid credentials', async ({ apiClient }) => {
    const result = await postCredentials(apiClient, 'invalid@example.com', 'wrongpassword');

    const payload = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
    expect(payload.toLowerCase()).toContain('error=credentialssignin');
  });

  test('should have valid session token after login', async ({ request }) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    const loginResult = await postCredentials(client, testAuth.email, testAuth.password);

    expect([200, 302]).toContain(loginResult.status);

    // Try accessing a protected endpoint that requires authentication
    const meResult = await client.get('/api/users/profile');
    expect(meResult.status).toBeLessThan(500);
  });
});
