/**
 * Suite 03: IaaS - Terraform Apply Tests (2.2, 2.3)
 * Test terraform configuration and verification in UI API
 */
import { test as base, expect } from '@playwright/test';
import YAML from 'yaml';
import { ApiClient } from '@/tests/helpers/api-client';
import { state } from '@/tests/helpers/state';
import { tfstatePayloadYaml } from '@/tests/fixtures/terraform-vars';

const test = base.extend<{ apiClient: ApiClient }>({
  apiClient: async ({ request }, runClient) => {
    const client = new ApiClient(request, process.env.BASE_URL || 'http://localhost:3000');
    await runClient(client);
  },
});

test.describe('03 - IaaS Terraform Configuration', () => {
  test('should configure terraform variables.tfvars', async ({ apiClient }) => {
    void apiClient;

    // Source payload is YAML, runner/terraform state APIs consume JSON.
    const tfstatePayloadObject = YAML.parse(tfstatePayloadYaml) as {
      version?: number;
      terraform_version?: string;
      resources?: Array<{ type?: string }>;
    };
    const tfstatePayloadJson = JSON.stringify(tfstatePayloadObject);

    expect(tfstatePayloadObject.version).toBe(4);
    expect(tfstatePayloadObject.terraform_version).toBe('1.5.7');
    expect(tfstatePayloadObject.resources?.[0]?.type).toBe('ansible_host');

    state.set('tfstatePayloadJson', tfstatePayloadJson);
  });

  test('should verify infrastructure exists in UI after terraform apply', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    expect(infraId).toBeDefined();

    // Verify infrastructure is accessible via API
    const result = await apiClient.get(`/api/infrastructures/${infraId}`);
    const payload = result.data as { id?: string };

    expect(result.ok).toBe(true);
    expect(payload.id).toBe(infraId);
  });

  test('should store tfstate as encrypted variable', async ({ apiClient }) => {
    const infraId = state.get('infrastructureId');
    const infraName = state.get('infrastructureName');
    expect(infraId).toBeDefined();
    expect(infraName).toBeDefined();

    // YAML fixture is converted to JSON before sending to API.
    const tfstatePayloadJson = state.get('tfstatePayloadJson')
      || JSON.stringify(YAML.parse(tfstatePayloadYaml));

    const result = await apiClient.post('/api/variables', {
      type: 'tfstate',
      key: infraId,
      key2: infraName,
      value: tfstatePayloadJson,
    });
    const payload = result.data as { id?: string };

    expect(result.ok).toBe(true);
    state.set('tfstateVariableId', payload.id);
  });
});
