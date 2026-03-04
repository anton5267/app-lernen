function registerUploadRoutes({ app, authRequired, uploadLimiter, upload, getDb, persist, createId }) {
  app.post('/api/upload', authRequired, uploadLimiter, upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'file is required' });
      }

      const db = getDb();
      const now = new Date().toISOString();
      const item = {
        id: createId(),
        userId: req.auth.userId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        createdAt: now,
      };

      db.uploads.push(item);
      await persist();
      return res.status(201).json({ item });
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = {
  registerUploadRoutes,
};
