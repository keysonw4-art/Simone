export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageValidationError";
  }
}

export class StorageUploadError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "StorageUploadError";
  }
}
