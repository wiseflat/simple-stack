/**
 * Suite 99: Cleanup - Software
 * Ordered step 1: remove software artifacts.
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

test.describe('99 - Software', () => {
  test('software: should cleanup software test item', async ({ apiClient }) => {
    const softwareId = state.get('softwareId');

    if (softwareId) {
      // DELETE is idempotent: 200 (cascaded) or 404 (already gone) are both acceptable.
      const softwareDelete = await apiClient.delete(`/api/softwares/${softwareId}`);
      expect(softwareDelete.ok || softwareDelete.status === 404).toBe(true);

      // Cascade should have removed these; clean up orphans if any remain.
      const softwareVarsResult = await apiClient.get(`/api/variables?type=software&key=${encodeURIComponent(softwareId)}`);
      expect(softwareVarsResult.ok).toBe(true);
      expect(Array.isArray(softwareVarsResult.data)).toBe(true);
      for (const v of (softwareVarsResult.data as any[])) {
        await apiClient.delete(`/api/variables/${v.id}`);
      }

      const secretVarsResult = await apiClient.get(`/api/variables?type=secret&key=${encodeURIComponent(softwareId)}`);
      expect(secretVarsResult.ok).toBe(true);
      expect(Array.isArray(secretVarsResult.data)).toBe(true);
      for (const v of (secretVarsResult.data as any[])) {
        await apiClient.delete(`/api/variables/${v.id}`);
      }

      // Verify both are now empty.
      const softwareVarsAfter = await apiClient.get(`/api/variables?type=software&key=${encodeURIComponent(softwareId)}`);
      expect((softwareVarsAfter.data as any[]).length).toBe(0);

      const secretVarsAfter = await apiClient.get(`/api/variables?type=secret&key=${encodeURIComponent(softwareId)}`);
      expect((secretVarsAfter.data as any[]).length).toBe(0);
    }

    state.set('softwareId', undefined);
    state.set('softwareDomain', undefined);
    state.set('softwareInfrastructureId', undefined);
  });
});
