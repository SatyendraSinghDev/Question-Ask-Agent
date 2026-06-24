import multer from 'multer';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.upload.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 8) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new ApiError(400, `File type ${file.mimetype} is not allowed`, 'BAD_FILE_TYPE'));
  }
  cb(null, true);
}

/**
 * Multer upload — single file. Use in routes as `upload.single('file')`.
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxUploadMb * 1024 * 1024 },
});

export { ALLOWED_MIME };
