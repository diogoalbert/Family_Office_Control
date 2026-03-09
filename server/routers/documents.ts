import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createDocument,
  deleteDocument,
  getAllDocuments,
  getUnprocessedDocuments,
  saveDocumentChunks,
  updateDocument,
} from "../db";
import { storagePut, storageRead } from "../storage";
import { invokeLLM, resolveForgeBaseUrl } from "../_core/llm";

// Generate a random suffix for S3 keys
function randomSuffix() {
  return Math.random().toString(36).substring(2, 10);
}

// Split text into chunks of ~800 chars with 100 char overlap
function splitIntoChunks(text: string, chunkSize = 800, overlap = 100): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.length > 50);
}

// Generate embedding for a text using LLM helper
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!apiKey) {
    throw new Error("BUILT_IN_FORGE_API_KEY is not configured");
  }

  // Use the invokeLLM helper to get embeddings via the built-in API
  const response = await fetch(`${resolveForgeBaseUrl()}/v1/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Embedding API error (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const data = (await response.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const documentsRouter = router({
  list: publicProcedure.query(async () => {
    return getAllDocuments();
  }),

  // Upload: receives base64 file data
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1),
        mimeType: z.string(),
        fileSize: z.number(),
        fileData: z.string(), // base64 encoded
        uploaderName: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { filename, mimeType, fileSize, fileData, uploaderName } = input;

      // Decode base64 to buffer
      const buffer = Buffer.from(fileData, "base64");

      // Generate unique S3 key
      const ext = filename.split(".").pop() ?? "bin";
      const fileKey = `family-office/documents/${randomSuffix()}-${Date.now()}.${ext}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, buffer, mimeType);

      // Save metadata to DB
      await createDocument({
        filename: `${randomSuffix()}.${ext}`,
        originalName: filename,
        fileUrl: url,
        fileKey,
        mimeType,
        fileSize,
        uploaderId: ctx.user?.id,
        uploaderName: uploaderName ?? ctx.user?.name ?? "Unknown",
        processed: false,
      });

      return { success: true, url, filename };
    }),

  // Process documents in background (extract text + generate embeddings)
  processDocuments: protectedProcedure.mutation(async () => {
    const unprocessed = await getUnprocessedDocuments();
    let processed = 0;
    let errors = 0;

    for (const doc of unprocessed) {
      try {
        // Download/read file content from configured storage backend
        const fileBuffer = await storageRead(doc.fileKey);

        let text = "";

        if (doc.mimeType === "application/pdf" || doc.originalName.endsWith(".pdf")) {
          if (doc.fileUrl.startsWith("/api/local-storage/")) {
            throw new Error("PDF processing requires BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY");
          }
          // For PDFs, use LLM to extract text via file_url content type
          const extractResponse = await invokeLLM({
            messages: [
              {
                role: "user" as const,
                content: [
                  {
                    type: "file_url" as const,
                    file_url: {
                      url: doc.fileUrl,
                      mime_type: "application/pdf" as const,
                    },
                  },
                  {
                    type: "text" as const,
                    text: "Extract all text content from this document. Return only the raw text, no formatting or commentary.",
                  },
                ] as any,
              },
            ],
          });
          const rawContent = extractResponse.choices[0]?.message?.content;
          text = typeof rawContent === "string" ? rawContent : "";
        } else {
          // For text files, read directly
          text = fileBuffer.toString("utf-8");
        }

        if (!text || text.length < 50) {
          await updateDocument(doc.id, {
            processed: true,
            processingError: "Document appears empty or unreadable",
          });
          continue;
        }

        // Split into chunks
        const chunks = splitIntoChunks(text);

        // Generate embeddings for each chunk
        const chunksWithEmbeddings = [];
        for (let i = 0; i < chunks.length; i++) {
          try {
            const embedding = await generateEmbedding(chunks[i]);
            chunksWithEmbeddings.push({
              documentId: doc.id,
              chunkIndex: i,
              content: chunks[i],
              embedding,
            });
          } catch (embErr) {
            console.error(`Embedding error for chunk ${i}:`, embErr);
          }
        }

        // Save chunks to DB
        await saveDocumentChunks(chunksWithEmbeddings);

        // Mark as processed
        await updateDocument(doc.id, { processed: true, processingError: null });
        processed++;
      } catch (err) {
        console.error(`Error processing document ${doc.id}:`, err);
        await updateDocument(doc.id, {
          processed: true,
          processingError: String(err),
        });
        errors++;
      }
    }

    return { processed, errors, total: unprocessed.length };
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDocument(input.id);
      return { success: true };
    }),
});

// Export helpers for use in chat router
export { generateEmbedding, cosineSimilarity };
