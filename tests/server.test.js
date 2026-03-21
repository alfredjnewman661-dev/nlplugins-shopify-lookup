const { validateLicense } = require('../license');

describe('License module', () => {
  it('returns evaluation mode without key', async () => {
    const result = await validateLicense(null);
    expect(result.mode).toBe('evaluation');
  });
});
