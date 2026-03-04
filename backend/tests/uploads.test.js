const { normalizeServerError } = require('../src/uploads');

describe('uploads helpers', () => {
  it('normalizes multer file-size error', () => {
    const result = normalizeServerError({
      name: 'MulterError',
      code: 'LIMIT_FILE_SIZE',
    });
    expect(result.status).toBe(413);
    expect(result.message).toContain('File is too large');
  });

  it('normalizes unsupported file type error', () => {
    const result = normalizeServerError(new Error('Unsupported file type'));
    expect(result).toEqual({
      status: 400,
      message: 'Unsupported file type. Use AVI/MP4/MKV/MOV/WEBM.',
    });
  });

  it('normalizes generic server error fallback', () => {
    const result = normalizeServerError({});
    expect(result).toEqual({
      status: 500,
      message: 'Internal Server Error',
    });
  });
});
