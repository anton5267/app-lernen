const path = require('path');
const multer = require('multer');
const { uploadsDir, uploadMaxSizeMb } = require('./config');

function createUploadMiddleware(createId) {
  const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      cb(null, `${createId()}${ext}`);
    },
  });

  return multer({
    storage: uploadStorage,
    limits: { fileSize: uploadMaxSizeMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        'video/x-msvideo',
        'video/mp4',
        'video/x-matroska',
        'video/quicktime',
        'video/webm',
      ];

      if (!allowed.includes(file.mimetype)) {
        return cb(new Error('Unsupported file type'));
      }

      return cb(null, true);
    },
  });
}

function normalizeServerError(error) {
  if (error?.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        status: 413,
        message: `File is too large. Max ${uploadMaxSizeMb}MB.`,
      };
    }

    return {
      status: 400,
      message: error.message || 'Upload error',
    };
  }

  if (error?.message === 'Unsupported file type') {
    return {
      status: 400,
      message: 'Unsupported file type. Use AVI/MP4/MKV/MOV/WEBM.',
    };
  }

  return {
    status: Number(error?.status) || 500,
    message: error?.message || 'Internal Server Error',
  };
}

module.exports = {
  createUploadMiddleware,
  normalizeServerError,
};
