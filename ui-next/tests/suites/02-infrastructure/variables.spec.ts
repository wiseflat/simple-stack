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

test.describe('02 - Infrastructure Variables', () => {
  test('should create one project variable accessible from UI project scope', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    const infraName = state.get('infrastructureName');
    expect(infraId).toBeDefined();
    expect(infraName).toBeDefined();

    const yamlValue = `
ansible_user: debian
ansible_port: 22
ansible_python_interpreter: /usr/bin/python3
        `;

    const result = await apiClient.post('/api/variables', {
      type: 'project',
      key: infraId,
      key2: infraName,
      value: yamlValue,
    });

    expect(result.ok).toBe(true);

    const listResult = await apiClient.get(
      `/api/variables?type=project&key=${infraId}&key2=${encodeURIComponent(infraName)}`,
    );
    expect(listResult.ok).toBe(true);
    const listedRows = listResult.data as VariableRow[];
    expect(listedRows.length).toBeGreaterThan(0);

    const created = listedRows[0];
    expect(created.type).toBe('project');
    expect(created.key).toBe(infraId);
    expect(created.key2).toBe(infraName);

    state.set('infraVariableId', created.id);
    state.set('infraCleanupVariableId', undefined);
  });
});
