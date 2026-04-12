/**
 * Catalog Secrets Fixture (2.5)
 * Registry credentials for building and pushing Docker images
 */

export const catalogSecrets = {
  registry_password: process.env.REGISTRY_PASSWORD || 'testpass',
  registry_token: process.env.REGISTRY_TOKEN || 'test-token-xyz',
};
