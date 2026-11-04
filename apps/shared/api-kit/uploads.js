// File uploads on shared storage.
//
// UPLOAD_DIR is an Amazon EFS volume mounted ReadWriteMany into every API
// replica (see the app's PersistentVolumeClaim). A file uploaded through one
// pod is immediately readable from every other pod, and it survives pod
// restarts, rescheduling and scale-down - which is the whole point of EFS here.
//
// Apps that use this module must list "multer" in their package.json.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { HttpError, notFound } from './errors.js';
import { log } from './log.js';

export const uploadsRoot = () => process.env.UPLOAD_DIR || '/data/uploads';

const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,120}$/i;

/**
 * multer instance storing files in <UPLOAD_DIR>/<subdir> under random names.
 * @param {{subdir: string, maxBytes: number, types: Record<string,string>}} opts
 *   types maps accepted MIME types to file extensions.
 */
export function createUploader({ subdir, maxBytes, types }) {
  const dir = path.join(uploadsRoot(), subdir);
  return multer({
    storage: multer.diskStorage({
      destination(_req, _file, cb) {
        fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
      },
      filename(_req, file, cb) {
        const id = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}`;
        cb(null, `${id}${types[file.mimetype]}`);
      },
    }),
    limits: { fileSize: maxBytes, files: 10 },
    fileFilter(_req, file, cb) {
      if (types[file.mimetype]) return cb(null, true);
      return cb(new HttpError(415, `Unsupported file type: ${file.mimetype}. Allowed: ${Object.values(types).join(', ')}`));
    },
  });
}

/** GET <route>/:name streams a stored file. */
export function serveUploads(router, route, subdir) {
  router.get(`${route}/:name`, (req, res, next) => {
    const { name } = req.params;
    if (!SAFE_NAME.test(name)) return next(notFound('File not found'));
    const file = path.join(uploadsRoot(), subdir, name);
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return next(notFound('File not found'));
      res.sendFile(file, { maxAge: '7d', dotfiles: 'deny', headers: { 'X-Content-Type-Options': 'nosniff' } });
    });
  });
}

/** Readiness check: the shared volume is mounted and writable. */
export async function uploadsWritable() {
  const probe = path.join(uploadsRoot(), `.ready-${process.pid}`);
  await fs.promises.writeFile(probe, String(Date.now()));
  await fs.promises.unlink(probe);
}

/**
 * Copy bundled sample files into <UPLOAD_DIR>/<subdir> unless they are there
 * already (idempotent - safe on every start, from every replica).
 */
export async function seedFiles(srcDir, subdir) {
  const dest = path.join(uploadsRoot(), subdir);
  await fs.promises.mkdir(dest, { recursive: true });
  let copied = 0;
  for (const name of await fs.promises.readdir(srcDir)) {
    const target = path.join(dest, name);
    try {
      await fs.promises.copyFile(path.join(srcDir, name), target, fs.constants.COPYFILE_EXCL);
      copied++;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
  if (copied) log('info', 'seeded files onto shared storage', { subdir, copied });
}

/** Remove a stored file (best effort). */
export async function removeUpload(subdir, name) {
  if (!SAFE_NAME.test(name)) return;
  await fs.promises.unlink(path.join(uploadsRoot(), subdir, name)).catch(() => {});
}
