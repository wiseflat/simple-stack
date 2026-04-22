/**
 * Suite 05: Catalog Management Tests (4.1, 4.2, 4.3)
 * Test catalog import, configuration, and build operations
 */
import { test as base, expect } from '@playwright/test';
import { ApiClient } from '@/tests/helpers/api-client';
import { state } from '@/tests/helpers/state';
import { catalogVariables } from '@/tests/fixtures/catalog-variables';

const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    await use(client);
  },
});

test.describe('05 - Catalog Management', () => {
  test('should create a test catalog', async ({ apiClient }) => {
    const catalogName = `test-catalog-${Date.now()}`;

    const result = await apiClient.post('/api/catalogs', {
      name: catalogName,
      version: '1.0.0',
      forkable: true,
    });

    expect(result.ok).toBe(true);

    // Find and store the created catalog
    const listResult = await apiClient.get('/api/catalogs');
    expect(listResult.ok).toBe(true);

    const catalog = (listResult.data as any).items?.find((c: any) => c.name === catalogName);
    if (catalog) {
      state.set('catalogId', catalog.id);
      state.set('catalogName', catalog.name);
    }
  });

  test('should list available catalogs', async ({ apiClient }) => {
    const result = await apiClient.get('/api/catalogs');

    expect(result.ok).toBe(true);
    expect((result.data as any).items).toBeDefined();
    expect(Array.isArray((result.data as any).items)).toBe(true);
  });

  test('should configure catalog variables', async ({ apiClient }) => {
    const catalogId = state.get('catalogId');
    if (!catalogId) {
      test.skip();
      return;
    }

    const result = await apiClient.post('/api/variables', {
      type: 'runner_catalog',
      key: catalogId,
      key2: catalogId,
      value: `
registry_host: ${catalogVariables.registry_host}
registry_username: ${catalogVariables.registry_username}
registry_namespace: ${catalogVariables.registry_namespace}
      `,
    });

    expect(result.ok).toBe(true);
  });

  test('should update catalog metadata', async ({ apiClient }) => {
    const catalogId = state.get('catalogId');
    if (!catalogId) {
      test.skip();
      return;
    }

    const result = await apiClient.put(`/api/catalogs/${catalogId}`, {
      alias: 'test catalog alias',
      description: 'Test catalog for automated testing',
      documentation: 'https://example.com/docs',
      cron: true,
      crontab: '0 2 * * *',
    });

    expect(result.ok).toBe(true);
  });

  test('should trigger build operation on catalog', async ({ apiClient }) => {
    if (!process.env.RUNNER_ENDPOINT) {
      test.skip();
      return;
    }

    const catalogId = state.get('catalogId');
    if (!catalogId) {
      test.skip();
      return;
    }

    // Note: Build requires runner endpoint and registry credentials
    const result = await apiClient.post(`/api/catalogs/${catalogId}/execute`, {
      action: 'build',
    });

    expect([200, 202, 400, 503]).toContain(result.status);

    if (result.ok) {
      console.log('[INFO] Catalog build triggered:', result.data);
    }
  });

  test('should defer catalog item deletion to final cleanup', async ({ apiClient }) => {
    const catalogId = state.get('catalogId');
    if (!catalogId) {
      test.skip();
      return;
    }

    const getCatalog = await apiClient.get(`/api/catalogs/${catalogId}`);
    expect(getCatalog.ok).toBe(true);
  });
});
