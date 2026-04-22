/**
 * Suite 06: Software Deployment Tests (5.1, 5.2)
 * Test software variable configuration and deployment
 */
import { test as base, expect } from '@playwright/test';
import { ApiClient } from '@/tests/helpers/api-client';
import { state } from '@/tests/helpers/state';
import { softwareVariables } from '@/tests/fixtures/software-variables';

const TEST_INSTANCE_NAME = 'instance001.frontends.region.provider.test';

async function resolveSoftwareInstance(apiClient: ApiClient): Promise<string | null> {
  const graphResult = await apiClient.get<{ nodes?: Array<{ collection?: string; key?: string }> }>('/api/graphs');
  if (!graphResult.ok) return null;

  const instances = (graphResult.data?.nodes ?? [])
    .filter((node) => node.collection === 'instance' && typeof node.key === 'string' && node.key.length > 0)
    .map((node) => node.key as string);

  if (!instances.length) return null;
  return instances.includes(TEST_INSTANCE_NAME) ? TEST_INSTANCE_NAME : instances[0];
}

const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    await use(client);
  },
});

test.describe('06 - Software Deployment', () => {
  test('should create a new software instance', async ({ apiClient }) => {
    const catalogId = state.get('catalogId');
    const infraId = state.get('infrastructureId');
    const instanceName = await resolveSoftwareInstance(apiClient);

    if (!catalogId || !infraId || !instanceName) {
      test.skip();
      return;
    }

    const domain = `test-software-${Date.now()}.local`;

    // UI uses /api/graphs instance keys (FQDN-like values) for software creation.
    const result = await apiClient.post('/api/softwares', {
      instance: instanceName,
      software: catalogId,
      size: 'small',
      domain: domain,
      domain_alias: `${domain},alias.local`,
      exposition: 'private',
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);

    // Find and store the created software
    const listResult = await apiClient.get('/api/softwares');
    expect(listResult.ok).toBe(true);

    const software = (listResult.data as any).items?.find((s: any) => s.domain === domain);
    if (software) {
      state.set('softwareId', software.id);
      state.set('softwareDomain', software.domain);
      state.set('softwareInfrastructureId', software.instance);
      expect(software.instance).toBe(instanceName);
    }
  });

  test('should list software instances', async ({ apiClient }) => {
    const result = await apiClient.get('/api/softwares');

    expect(result.ok).toBe(true);
    expect((result.data as any).items).toBeDefined();
    expect(Array.isArray((result.data as any).items)).toBe(true);
  });

  test('should configure software variables', async ({ apiClient }) => {
    const softwareId = state.get('softwareId');
    if (!softwareId) {
      test.skip();
      return;
    }

    const result = await apiClient.post('/api/variables', {
      type: 'software',
      key: softwareId,
      key2: softwareId,
      value: `
environment: ${softwareVariables.environment}
enable_ssl: ${softwareVariables.enable_ssl}
log_level: ${softwareVariables.log_level}
      `,
    });

    expect(result.ok).toBe(true);
  });

  test('should store software secrets', async ({ apiClient }) => {
    const softwareId = state.get('softwareId');
    if (!softwareId) {
      test.skip();
      return;
    }

    const result = await apiClient.post('/api/variables/secret', {
      type: 'secret',
      key: softwareId,
      subkey: 'admin_password',
      missing: 'create',
      length: 32,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'string').toBe(true);
  });

  test('should update software metadata', async ({ apiClient }) => {
    const softwareId = state.get('softwareId');
    if (!softwareId) {
      test.skip();
      return;
    }

    const currentResult = await apiClient.get(`/api/softwares/${softwareId}`);
    expect(currentResult.ok).toBe(true);
    const item = (currentResult.data as any).item;

    const result = await apiClient.put(`/api/softwares/${softwareId}`, {
      instance: item.instance,
      software: item.softwareId,
      size: 'medium',
      domain: item.domain,
      domain_alias: item.domainAlias ?? '',
      exposition: 'public',
    });

    expect(result.ok).toBe(true);

    const versionResult = await apiClient.put(`/api/softwares/${softwareId}`, {
      version: '1.2.3',
    });
    expect(versionResult.ok).toBe(true);
  });

  test('should retrieve software details', async ({ apiClient }) => {
    const softwareId = state.get('softwareId');
    if (!softwareId) {
      test.skip();
      return;
    }

    const result = await apiClient.get(`/api/softwares/${softwareId}`);

    expect(result.ok).toBe(true);
    expect((result.data as any).item).toBeDefined();
  });
});
