import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { S3 } from "ibm-cos-sdk";

// Initialize IBM Cloud Object Storage client
const cos = new S3({
  endpoint: process.env.IBM_COS_ENDPOINT || "s3.us-south.cloud-object-storage.appdomain.cloud",
  apiKeyId: process.env.IBM_COS_API_KEY!,
  serviceInstanceId: process.env.IBM_COS_INSTANCE_ID!,
});

const BUCKET_NAME = process.env.IBM_COS_BUCKET_NAME || "albert-papers";

// Schema for upload
const uploadSchema = z.object({
  userId: z.string(),
  paperId: z.string(),
  pdfBase64: z.string(),
  metadata: z.object({
    title: z.string(),
    filename: z.string(),
    pageCount: z.number(),
    uploadedAt: z.number(),
  }),
});

// Schema for download
const downloadSchema = z.object({
  userId: z.string(),
  paperId: z.string(),
});

// Schema for delete
const deleteSchema = z.object({
  userId: z.string(),
  paperId: z.string(),
});

// Schema for list
const listSchema = z.object({
  userId: z.string(),
});

/**
 * Upload a PDF to IBM Cloud Object Storage
 */
export const uploadPaperToCOS = createServerFn({ method: "POST" })
  .inputValidator((data) => uploadSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { userId, paperId, pdfBase64, metadata } = data;
      const key = `${userId}/${paperId}.pdf`;

      // Convert base64 to buffer
      const pdfBuffer = Buffer.from(pdfBase64, "base64");

      // Upload to COS
      await cos
        .putObject({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: pdfBuffer,
          ContentType: "application/pdf",
          Metadata: {
            title: metadata.title,
            filename: metadata.filename,
            pageCount: metadata.pageCount.toString(),
            uploadedAt: metadata.uploadedAt.toString(),
            userId: userId,
            paperId: paperId,
          },
        })
        .promise();

      console.log(`✅ Uploaded paper to COS: ${key}`);

      return {
        success: true,
        key,
        url: `https://${BUCKET_NAME}.${process.env.IBM_COS_ENDPOINT}/${key}`,
      };
    } catch (error) {
      console.error("❌ Failed to upload to COS:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

/**
 * Download a PDF from IBM Cloud Object Storage
 */
export const downloadPaperFromCOS = createServerFn({ method: "POST" })
  .inputValidator((data) => downloadSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { userId, paperId } = data;
      const key = `${userId}/${paperId}.pdf`;

      // Get object from COS
      const result = await cos
        .getObject({
          Bucket: BUCKET_NAME,
          Key: key,
        })
        .promise();

      // Convert buffer to base64
      const pdfBase64 = result.Body?.toString("base64");

      if (!pdfBase64) {
        throw new Error("Failed to read PDF data");
      }

      console.log(`✅ Downloaded paper from COS: ${key}`);

      return {
        success: true,
        pdfBase64,
        metadata: result.Metadata,
      };
    } catch (error) {
      console.error("❌ Failed to download from COS:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

/**
 * Delete a PDF from IBM Cloud Object Storage
 */
export const deletePaperFromCOS = createServerFn({ method: "POST" })
  .inputValidator((data) => deleteSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { userId, paperId } = data;
      const key = `${userId}/${paperId}.pdf`;

      // Delete object from COS
      await cos
        .deleteObject({
          Bucket: BUCKET_NAME,
          Key: key,
        })
        .promise();

      console.log(`✅ Deleted paper from COS: ${key}`);

      return { success: true };
    } catch (error) {
      console.error("❌ Failed to delete from COS:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

/**
 * List all papers for a user in IBM Cloud Object Storage
 */
export const listPapersInCOS = createServerFn({ method: "POST" })
  .inputValidator((data) => listSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { userId } = data;
      const prefix = `${userId}/`;

      // List objects with user prefix
      const result = await cos
        .listObjectsV2({
          Bucket: BUCKET_NAME,
          Prefix: prefix,
        })
        .promise();

      const papers =
        result.Contents?.map((obj) => ({
          key: obj.Key!,
          size: obj.Size!,
          lastModified: obj.LastModified!,
          paperId: obj.Key!.replace(prefix, "").replace(".pdf", ""),
        })) || [];

      console.log(`✅ Listed ${papers.length} papers for user ${userId}`);

      return { success: true, papers };
    } catch (error) {
      console.error("❌ Failed to list papers from COS:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: message };
    }
  });

/**
 * Check if IBM COS is configured and accessible
 */
export const checkCOSConnection = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      // Try to list buckets to verify connection
      await cos.listBuckets().promise();

      console.log("✅ IBM COS connection successful");

      return {
        success: true,
        configured: true,
        endpoint: process.env.IBM_COS_ENDPOINT,
        bucket: BUCKET_NAME,
      };
    } catch (error) {
      console.error("❌ IBM COS connection failed:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        configured: false,
        error: message,
      };
    }
  }
);

// Made with Bob
