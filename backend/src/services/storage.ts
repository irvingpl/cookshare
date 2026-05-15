import multer, { StorageEngine } from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const isS3Enabled =
  !!(process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION &&
    process.env.AWS_S3_BUCKET);

function buildLocalStorage(): StorageEngine {
  const uploadDir = process.env.UPLOAD_DIR || './src/uploads';
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
  });
}

function buildS3Storage(): StorageEngine {
  const s3 = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  return multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `uploads/${uuidv4()}${ext}`);
    },
  });
}

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다.'));
  }
};

export const upload = multer({
  storage: isS3Enabled ? buildS3Storage() : buildLocalStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export function getImageUrl(file: Express.Multer.File): string {
  // S3: multer-s3가 file.location을 채워줌
  if (isS3Enabled && (file as any).location) {
    return (file as any).location as string;
  }
  // Local
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  return `${baseUrl}/uploads/${file.filename}`;
}

console.log(`[Storage] mode: ${isS3Enabled ? 'S3' : 'local'}`);
