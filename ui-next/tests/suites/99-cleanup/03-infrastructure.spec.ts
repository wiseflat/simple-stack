/**
 * Suite 99: Cleanup - Infrastructure
 * Ordered step 3: remove infrastructure and verify linked cleanup.
 */
import { test as base, expect } from '@playwright/test';
import { ApiClient } from '@/tests/helpers/api-client';
import { state } from '@/tests/helpers/state';

const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    await use(client);
  },
});

test.describe('99 - Infrastructure', () => {
  test('infrastructure: should cleanup infrastructure and linked variables/secrets', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    expect(infraId).toBeDefined();

    const beforeVars = await apiClient.get(`/api/variables?key=${infraId}`);
    expect(beforeVars.ok).toBe(true);
    expect(Array.isArray(beforeVars.data)).toBe(true);
    expect((beforeVars.data as any[]).length).toBeGreaterThan(0);

    const infraDelete = await apiClient.post(`/api/infrastructures/${infraId}/remove`, {
      action: 'remove',
    });
    expect(infraDelete.ok).toBe(true);

    const infraAfterDelete = await apiClient.get(`/api/infrastructures/${infraId}`);
    expect(infraAfterDelete.status).toBe(404);

    const afterVars = await apiClient.get(`/api/variables?key=${infraId}`);
    expect(afterVars.ok).toBe(true);
    expect(Array.isArray(afterVars.data)).toBe(true);
    expect((afterVars.data as any[]).length).toBe(0);

    const secretAfterDelete = await apiClient.post('/api/variables/secret', {
      type: 'project',
      key: infraId,
      subkey: 'cleanup_secret',
      missing: 'warn',
    });
    expect([460, 461]).toContain(secretAfterDelete.status);

    state.set('infrastructureId', undefined);
    state.set('infrastructureName', undefined);
    state.set('infraVariableId', undefined);
    state.set('infraCleanupVariableId', undefined);
  });
});
