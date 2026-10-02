/**
 * jest.config.js for cloudrop-server
 *
 * Uses Node's --experimental-vm-modules to support ES module tests.
 */
export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  // No transform needed — Jest runs native ESM via experimental VM modules
}
