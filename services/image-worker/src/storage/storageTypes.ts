export type UploadObjectInput = {
  objectKey: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
};

export type UploadObjectResult = {
  objectKey: string;
  sizeBytes: number;
  etag?: string;
};

export type ObjectStorage = {
  downloadObject(objectKey: string): Promise<Buffer>;
  uploadObject(input: UploadObjectInput): Promise<UploadObjectResult>;
};
