import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getR2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export async function generateUploadUrl(key: string, contentType: string): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function deleteR2Object(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    })
  );
}

export async function deleteHlsFiles(hlsPath: string): Promise<void> {
  // Coconut creates predictable byte-range HLS structure
  const filesToDelete = [
    `${hlsPath}/master.m3u8`,
    `${hlsPath}/media-1/stream.m3u8`,
    `${hlsPath}/media-1/media.ts`,
    `${hlsPath}/media-2/stream.m3u8`,
    `${hlsPath}/media-2/media.ts`,
    `${hlsPath}/media-3/stream.m3u8`,
    `${hlsPath}/media-3/media.ts`,
  ];

  for (const key of filesToDelete) {
    await deleteR2Object(key);
  }
}
