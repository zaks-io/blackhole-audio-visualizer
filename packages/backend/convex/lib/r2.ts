import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
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

// Multipart upload functions for large files

export async function initiateMultipartUpload(
  key: string,
  contentType: string
): Promise<{ uploadId: string }> {
  const client = getR2Client();
  const command = new CreateMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  const response = await client.send(command);
  if (!response.UploadId) {
    throw new Error("Failed to initiate multipart upload");
  }
  return { uploadId: response.UploadId };
}

export async function generatePartUploadUrl(
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const client = getR2Client();
  const command = new UploadPartCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ PartNumber: number; ETag: string }>
): Promise<void> {
  const client = getR2Client();
  const command = new CompleteMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
    },
  });
  await client.send(command);
}

export async function abortMultipartUpload(key: string, uploadId: string): Promise<void> {
  const client = getR2Client();
  const command = new AbortMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    UploadId: uploadId,
  });
  await client.send(command);
}

export async function listUploadedParts(
  key: string,
  uploadId: string
): Promise<Array<{ PartNumber: number; ETag: string; Size: number }>> {
  const client = getR2Client();
  const parts: Array<{ PartNumber: number; ETag: string; Size: number }> = [];
  let partNumberMarker: string | undefined;

  do {
    const command = new ListPartsCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      UploadId: uploadId,
      PartNumberMarker: partNumberMarker,
    });
    const response = await client.send(command);

    if (response.Parts) {
      for (const part of response.Parts) {
        if (part.PartNumber && part.ETag && part.Size) {
          parts.push({
            PartNumber: part.PartNumber,
            ETag: part.ETag,
            Size: part.Size,
          });
        }
      }
    }

    partNumberMarker = response.IsTruncated ? response.NextPartNumberMarker : undefined;
  } while (partNumberMarker);

  return parts;
}
