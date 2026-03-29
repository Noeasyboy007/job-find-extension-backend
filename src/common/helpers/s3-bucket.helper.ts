import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

export type S3BucketConfig = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
};

export function createS3Client(cfg: S3BucketConfig): S3Client {
  return new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
    followRegionRedirects: true,
  });
}

// Virtual-hosted–style object URL (works when the bucket allows public read or you use signed URLs separately).
export function buildS3ObjectPublicUrl(
  bucket: string,
  region: string,
  key: string,
): string {
  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
}

export function buildResumeObjectKey(userId: number, originalFileName: string): string {
  const safe = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return `resumes/${userId}/${randomUUID()}-${safe || 'resume'}`;
}

export async function putObjectBuffer(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBuffer(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<Buffer> {
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

export async function deleteObjectByKey(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
