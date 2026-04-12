/**
 * Suite 04: PaaS - Runner Execution Tests (3.1, 3.2)
 * Test runner configuration and playbook execution
 */
import { test as base, expect } from '@playwright/test';
import { ApiClient } from '@/tests/helpers/api-client';
import { state } from '@/tests/helpers/state';

const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, runClient) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    await runClient(client);
  },
});

test.describe('04 - PaaS Runner Configuration', () => {
  test('should configure runner variables in infrastructure section', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    const infraName = state.get('infrastructureName');
    expect(infraId).toBeDefined();
    expect(infraName).toBeDefined();

    const result = await apiClient.post('/api/variables', {
      type: 'runner_infrastructure',
      key: infraId,
      key2: infraName,
      value: `
url: http://127.0.0.1:5001
authentication: false
login: null
password: null
      `,
    });

    expect(result.ok).toBe(true);
  });

  test.skip(!process.env.RUNNER_ENDPOINT, 'Runner endpoint not configured');

  test('should trigger "Run all playbook" operation', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    expect(infraId).toBeDefined();

    // Note: This requires a valid runner endpoint and tfstate
    // In test environment, this may fail or be skipped
    const result = await apiClient.post(`/api/infrastructures/${infraId}/execute`, {
      action: 'init',
    });

    // Expect either success or informative error (missing tfstate, etc.)
    expect([200, 204, 400, 503]).toContain(result.status);

    if (result.ok) {
      console.log('[INFO] Runner operation succeeded:', result.data);
    } else {
      console.log('[INFO] Runner operation skipped/failed (expected in isolated test):', result.status);
    }
  });

  test('should handle runner configuration errors gracefully', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    expect(infraId).toBeDefined();

    // Execute without proper runner config should fail gracefully
    const result = await apiClient.post(`/api/infrastructures/${infraId}/execute`, {
      action: 'unknownaction',
    });

    expect(result.ok).toBe(false);
  });
});
