/**
 * Infrastructure Variables Fixture
 * Define baseline infrastructure template for CRUD testing
 */

const digitToLetter = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
const runSuffix = `${Date.now()}`.replace(/[0-9]/g, (d) => digitToLetter[Number(d)]);

export const testInfrastructure = {
  name: `test-infra-${runSuffix}`,
  description: 'Test infrastructure for automated testing',
  icon: 'cloud',
  color: '#3b82f6',
};
