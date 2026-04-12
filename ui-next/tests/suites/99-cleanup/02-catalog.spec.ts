/**
 * Suite 99: Cleanup - Catalog
 * Ordered step 2: remove catalog artifacts.
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

test.describe('99 - Catalog', () => {
  test('catalog: should cleanup catalog test item', async ({ apiClient }) => {
    const catalogId = state.get('catalogId');

    if (catalogId) {
      const catalogDelete = await apiClient.delete(`/api/catalogs/${catalogId}`);
      expect(catalogDelete.ok).toBe(true);
    }

    state.set('catalogId', undefined);
    state.set('catalogName', undefined);
  });
});
