import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';

const region = process.env.AWS_REGION ?? 'eu-west-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const BUCKET = process.env.AWS_S3_PHOTOS_BUCKET ?? 'meylio-user-photos';

const client =
  accessKeyId && secretAccessKey
    ? new S3Client({ region, credentials: { accessKeyId, secretAccessKey } })
    : null;

// Railway's filesystem is ephemeral (wiped on every deploy), so photos are
// stored in S3 instead. The `/uploads/:key` route still proxies bytes back
// through the backend so photo URLs and mobile code stay unchanged.
export async function uploadPhoto(key: string, body: Buffer, contentType: string): Promise<void> {
  if (!client) {
    throw new Error('AWS S3 non configuré (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY manquants).');
  }
  await client.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export async function getPhotoBuffer(key: string): Promise<Buffer | null> {
  if (!client) return null;
  try {
    const result = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const stream = result.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function getPhotoStream(
  key: string
): Promise<{ stream: Readable; contentType: string | undefined; contentLength: number | undefined }> {
  if (!client) throw new Error('AWS S3 non configuré.');
  const result = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return {
    stream: result.Body as Readable,
    contentType: result.ContentType,
    contentLength: result.ContentLength,
  };
}

export async function deletePhoto(key: string): Promise<void> {
  if (!client) return;
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function photoKeyFromUrl(url: string): string {
  return url.replace(/^\/uploads\//, '');
}
