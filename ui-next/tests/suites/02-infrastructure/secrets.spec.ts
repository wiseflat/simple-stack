/**
 * Suite 02: Infrastructure Variables Tests (1.2 + 2.4)
 * Test creating and managing variables for infrastructure
 */
import { test as base, expect } from '@playwright/test';
import { ApiClient } from '@/tests/helpers/api-client';
import { state } from '@/tests/helpers/state';

type VariableRow = {
  id: string;
  type: string;
  key: string;
  key2?: string;
  value?: unknown;
};

const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, runClient) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    await runClient(client);
  },
});

test.describe('02 - Infrastructure Secrets', () => {
  test('should create one project secret accessible from UI project scope', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    const infraName = state.get('infrastructureName');
    expect(infraId).toBeDefined();
    expect(infraName).toBeDefined();

    const yamlValue = `
secret_key: supersecret
        `;

    const result = await apiClient.post('/api/variables', {
      type: 'secret',
      key: infraId,
      key2: infraName,
      value: yamlValue,
    });

    expect(result.ok).toBe(true);

    const listResult = await apiClient.get(
      `/api/variables?type=secret&key=${infraId}&key2=${encodeURIComponent(infraName)}`,
    );
    expect(listResult.ok).toBe(true);
    const listedRows = listResult.data as VariableRow[];
    expect(listedRows.length).toBeGreaterThan(0);

    const created = listedRows[0];
    expect(created.type).toBe('secret');
    expect(created.key).toBe(infraId);
    expect(created.key2).toBe(infraName);

    state.set('infraSecretId', created.id);
    state.set('infraCleanupSecretId', undefined);
  });
});
