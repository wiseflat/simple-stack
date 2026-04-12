/**
 * Suite 02: Infrastructure CRUD Tests (1.2)
 * Test infrastructure create, read, update, delete
 */
import { test as base, expect } from '@playwright/test';
import { ApiClient } from '@/tests/helpers/api-client';
import { state } from '@/tests/helpers/state';
import { testInfrastructure } from '@/tests/fixtures/infrastructure';

const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    await use(client);
  },
});

test.describe('02 - Infrastructure CRUD', () => {
  test('should create a new infrastructure', async ({ apiClient }) => {
    const result = await apiClient.post('/api/infrastructures', testInfrastructure);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);

    // List to find the newly created infrastructure
    const listResult = await apiClient.get('/api/infrastructures');
    expect(listResult.ok).toBe(true);

    const infra = (listResult.data as any).items?.find(
      (i: any) => i.name === testInfrastructure.name,
    );
    expect(infra).toBeDefined();

    // Store for later suites
    state.set('infrastructureId', infra.id);
    state.set('infrastructureName', infra.name);
  });

  test('should read infrastructure details', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    expect(infraId).toBeDefined();

    const result = await apiClient.get(`/api/infrastructures/${infraId}`);

    expect(result.ok).toBe(true);
    expect((result.data as any).name).toBe(testInfrastructure.name);
    expect((result.data as any).description).toBe(testInfrastructure.description);
  });

  test('should update infrastructure', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    expect(infraId).toBeDefined();

    const updated = {
      name: testInfrastructure.name,
      description: 'Updated description for testing',
      icon: 'server',
      color: '#10b981',
    };

    const result = await apiClient.put(`/api/infrastructures/${infraId}`, updated);

    expect(result.ok).toBe(true);

    // Verify update
    const getResult = await apiClient.get(`/api/infrastructures/${infraId}`);
    expect(getResult.ok).toBe(true);
    expect((getResult.data as any).description).toBe('Updated description for testing');
  });

  test('should list infrastructures', async ({ apiClient }) => {
    const result = await apiClient.get('/api/infrastructures');

    expect(result.ok).toBe(true);
    expect((result.data as any).items).toBeDefined();
    expect(Array.isArray((result.data as any).items)).toBe(true);
  });

  // Note: DELETE is typically done at the end or in cleanup, skip for now
  // to preserve the infrastructure for subsequent test suites
});
