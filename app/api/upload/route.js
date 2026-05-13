// app/api/upload/route.js
if (typeof global.DOMMatrix === "undefined") {
  global.DOMMatrix = class DOMMatrix {
    constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
  };
}

import { NextResponse } from "next/server";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

// Tell PDF.js to use the legacy worker for Node.js compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

import connectDB from "@/lib/mongodb";
import { chunkText } from "@/lib/chunker";
import { callLLM, getEmbedding } from "@/lib/openrouter";
import DocumentChunk from "@/lib/models/Chunk";
import Triple from "@/lib/models/Triple";

/* =========================
   TEXT EXTRACTION FUNCTION
========================= */
async function extractText(buffer, fileType) {
  let text = "";

  // 📄 PDF
  if (fileType === "pdf") {
    const data = new Uint8Array(buffer);
    // disableFontFace: true is critical for Node.js as it prevents loading fonts into a non-existent browser DOM
    const loadingTask = pdfjsLib.getDocument({ 
      data,
      disableFontFace: true,
      verbosity: 0
    });
    const pdf = await loadingTask.promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Combine all text pieces from the page
      const strings = content.items.map((item) => item.str);
      text += strings.join(" ") + "\n";
    }
  }

  // 📄 TXT
  else if (fileType === "txt") {
    text = buffer.toString("utf-8");
  }

  // 📄 DOCX
  else if (fileType === "docx") {
    // Extract raw text from Word document
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  }

  else {
    throw new Error("Unsupported file type");
  }

  return text;
}

import Document from "@/lib/models/Document";
import Entity from "@/lib/models/Entity";
import Relationship from "@/lib/models/Relationship";

/* =========================
   MAIN API ROUTE
========================= */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = fileName.split(".").pop().toLowerCase();

    // Support all common text-based formats
    const supportedTypes = ["pdf", "txt", "docx", "md", "json"];
    if (!supportedTypes.includes(fileType)) {
       // We'll try to treat unknown as text if it's not binary, 
       // but for now let's stick to the requested "all type" by expanding slightly
       // or just allowing most common ones.
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 🔥 Extract text
    const fullText = await extractText(buffer, fileType);

    if (!fullText || fullText.trim().length < 10) {
      return NextResponse.json(
        { error: "Could not extract meaningful text" },
        { status: 400 }
      );
    }

    await connectDB();

    // 🔥 Save Document Metadata
    const newDoc = await Document.create({
      fileName,
      fileType,
      fullText,
    });

    // 🔥 Chunk text
    const chunks = chunkText(fullText, 600);

    // 🔥 Generate Embeddings and Save Chunks
    console.log(`📡 Generating embeddings for ${chunks.length} chunks...`);
    const chunkData = await Promise.all(
      chunks.map(async (content) => {
        const embedding = await getEmbedding(content);
        return { content, embedding, document: newDoc._id };
      })
    );
    const savedChunks = await DocumentChunk.insertMany(chunkData);

    // 🔥 Extract Entities & Relationships
    // We'll process a sample of chunks or all chunks depending on size. 
    // For a robust GraphRAG, we process all chunks.
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🧠 Graph extraction from chunk ${i + 1}/${chunks.length}...`);
      
      try {
        const systemPrompt = `Extract entities and their relationships from the text.
Return ONLY a valid JSON object with this structure:
{
  "entities": [{"name": "Entity Name", "type": "Person/Org/etc", "description": "brief description"}],
  "relationships": [{"source": "Entity A", "target": "Entity B", "relation": "how they connect", "description": "context"}]
}
Be precise. Avoid duplicate entities within the same chunk.`;

        const response = await callLLM(systemPrompt, chunk);
        
        // Clean response if LLM adds markdown backticks
        const cleanJson = response.replace(/```json|```/g, "").trim();
        const data = JSON.parse(cleanJson);

        if (data.entities && Array.isArray(data.entities)) {
          for (const ent of data.entities) {
            // Deduplicate entities by name, but track this document
            await Entity.findOneAndUpdate(
              { name: ent.name.trim() },
              { 
                $set: { type: ent.type, description: ent.description },
                $addToSet: { documents: newDoc._id }, // Add document ID if not already present
                $setOnInsert: { createdAt: new Date() }
              },
              { upsert: true, new: true }
            );
          }
        }

        if (data.relationships && Array.isArray(data.relationships)) {
          for (const rel of data.relationships) {
            const sourceEnt = await Entity.findOne({ name: rel.source.trim() });
            const targetEnt = await Entity.findOne({ name: rel.target.trim() });

            if (sourceEnt && targetEnt) {
              await Relationship.create({
                source: sourceEnt._id,
                target: targetEnt._id,
                relation: rel.relation,
                description: rel.description,
                document: newDoc._id
              });
            }
          }
        }
      } catch (err) {
        console.error(`Graph extraction error for chunk ${i}:`, err.message);
      }
    }

    return NextResponse.json({
      success: true,
      documentId: newDoc._id,
      chunks: savedChunks.length,
      message: `Successfully processed "${fileName}". Graph metadata extracted.`,
    });

  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed: " + error.message },
      { status: 500 }
    );
  }
}