import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import type { WorkerConfig } from "../config.js";
import type { ObjectStorage, UploadObjectInput, UploadObjectResult } from "./storageTypes.js";

export class R2Storage implements ObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: WorkerConfig["r2"]) {
    this.bucket = config.bucket;
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
    });
  }

  async downloadObject(objectKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
      }),
    );

    if (!response.Body) {
      throw new Error("Object body was empty");
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
      }),
    );

    return {
      objectKey: input.objectKey,
      sizeBytes: input.body.byteLength,
      etag: response.ETag,
    };
  }
}
