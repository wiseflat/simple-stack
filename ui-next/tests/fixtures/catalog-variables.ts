/**
 * Catalog Variables Fixture (4.2)
 */

export const catalogVariables = {
  registry_host: process.env.REGISTRY_HOST || 'registry.example.com',
  registry_username: process.env.REGISTRY_USERNAME || 'testuser',
  registry_namespace: process.env.REGISTRY_NAMESPACE || 'test',
};
