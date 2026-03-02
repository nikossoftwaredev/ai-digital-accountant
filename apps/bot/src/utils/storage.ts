import { createClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const BUCKET_NAME = "ai-accountant-tool";

let supabase: ReturnType<typeof createClient> | null = null;

const getSupabase = () => {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    supabase = createClient(url, key);
    logger.info("Supabase client initialized for storage");
  }
  return supabase;
};

export interface UploadedFile {
  fileName: string;
  fileUrl: string;
  fileType: string;
}

/**
 * Upload a file buffer to Supabase Storage.
 * Path: {clientId}/{scanId}/{filename}
 */
export const uploadFileToStorage = async (
  buffer: Buffer,
  clientId: string,
  scanId: string,
  fileName: string,
  contentType: string = "application/pdf"
): Promise<UploadedFile> => {
  const log = logger.child({ module: "storage" });
  const client = getSupabase();

  const storagePath = `${clientId}/${scanId}/${fileName}`;

  const { error } = await client.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    log.error({ error: error.message, storagePath }, "File upload failed");
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = client.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  log.info({ storagePath, fileName }, "File uploaded to Supabase Storage");

  return {
    fileName,
    fileUrl: urlData.publicUrl,
    fileType: contentType,
  };
};
