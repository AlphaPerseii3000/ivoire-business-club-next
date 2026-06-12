import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const DOCUMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const REQUIRED_AWS_ENV = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_BUCKET",
  "AWS_ENDPOINT",
] as const;

const REQUIRED_R2_ENV = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
};

let client: S3Client | null = null;

export function isAwsConfigured() {
  return REQUIRED_AWS_ENV.every((key) => !!process.env[key]);
}

export function isCorsSupportedByProvider() {
  if (!isAwsConfigured()) return true;

  const endpoint = process.env.AWS_ENDPOINT?.toLowerCase() ?? "";
  if (endpoint.includes("infomaniak") || endpoint.includes("swiss-backup")) {
    return false;
  }

  return true;
}

export function getMissingR2Env() {
  if (isAwsConfigured()) return [];
  return REQUIRED_R2_ENV.filter((key) => !process.env[key]);
}

export function getR2Config(): R2Config {
  if (isAwsConfigured()) {
    return {
      accountId: "aws",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      bucketName: process.env.AWS_BUCKET!,
      publicUrl: process.env.AWS_ENDPOINT || "",
    };
  }

  const missing = getMissingR2Env();
  if (missing.length > 0) {
    throw new Error(`Configuration R2/S3 manquante: ${missing.join(", ")}`);
  }

  return {
    accountId: process.env.R2_ACCOUNT_ID as string,
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    bucketName: process.env.R2_BUCKET_NAME as string,
    publicUrl: (process.env.R2_PUBLIC_URL as string).replace(/\/$/, ""),
  };
}

export function getR2Client() {
  if (client) return client;

  if (isAwsConfigured()) {
    client = new S3Client({
      region: process.env.AWS_DEFAULT_REGION || "us-east-1",
      endpoint: process.env.AWS_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: process.env.AWS_USE_PATH_STYLE_ENDPOINT === "true",
    });
    return client;
  }

  const config = getR2Config();
  client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return client;
}

export function isAllowedDocumentMimeType(mimeType: string) {
  return DOCUMENT_ALLOWED_MIME_TYPES.includes(mimeType as (typeof DOCUMENT_ALLOWED_MIME_TYPES)[number]);
}

export function getDocumentExtension(fileName: string, mimeType: string) {
  const safeName = fileName.toLowerCase();
  const fromName = safeName.match(/\.([a-z0-9]+)$/)?.[1];
  if (fromName && ["pdf", "jpg", "jpeg", "png", "webp"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

export function createDocumentR2Key(opportunityId: string, fileName: string, mimeType: string) {
  const extension = getDocumentExtension(fileName, mimeType);
  const randomId = crypto.randomUUID();
  return `opportunities/${opportunityId}/documents/${randomId}.${extension}`;
}

export function createPublicDocumentUrl(r2Key: string) {
  if (isAwsConfigured()) {
    const endpoint = process.env.AWS_ENDPOINT?.replace(/\/$/, "");
    const bucket = process.env.AWS_BUCKET;
    if (process.env.AWS_USE_PATH_STYLE_ENDPOINT === "true") {
      return `${endpoint}/${bucket}/${r2Key}`;
    } else {
      const parsedEndpoint = endpoint?.replace("https://", "https://" + bucket + ".");
      return `${parsedEndpoint}/${r2Key}`;
    }
  }
  const config = getR2Config();
  return `${config.publicUrl}/${r2Key}`;
}

export async function createUploadSignedUrl(params: { key: string; mimeType: string; expiresIn?: number }) {
  const config = getR2Config();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: params.key,
    ContentType: params.mimeType,
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: params.expiresIn ?? 300 });
}

export async function uploadObjectToS3(key: string, buffer: Buffer, mimeType: string) {
  const config = getR2Config();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
}

export async function createDownloadSignedUrl(params: { key: string; fileName?: string; mimeType?: string; expiresIn?: number }) {
  const config = getR2Config();
  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: params.key,
    ResponseContentType: params.mimeType,
    ResponseContentDisposition: params.fileName ? `inline; filename="${encodeURIComponent(params.fileName)}"` : "inline",
  });

  return getSignedUrl(getR2Client(), command, { expiresIn: params.expiresIn ?? 180 });
}

export async function deleteR2Object(key: string) {
  const config = getR2Config();
  await (getR2Client() as any).send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    }),
  );
}

export function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  }
  return `${Math.max(1, Math.round(size / 1024))} Ko`;
}
