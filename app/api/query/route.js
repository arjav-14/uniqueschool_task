// app/api/query/route.js
// This API route handles user questions.
// Steps: receive question → find relevant chunks → build prompt → call LLM → return answer

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { callLLM, getEmbedding } from "@/lib/openrouter";
import { cosineSimilarity } from "@/lib/similarity";
import DocumentChunk from "@/lib/models/Chunk";

import Entity from "@/lib/models/Entity";
import Relationship from "@/lib/models/Relationship";

import Document from "@/lib/models/Document";

export async function POST(request) {
  try {
    const body = await request.json();
    const { question } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    await connectDB();

    // ── Step 0: Identify the LATEST (Active) Document ──────────────
    const activeDoc = await Document.findOne().sort({ createdAt: -1 });
    
    if (!activeDoc) {
      return NextResponse.json({ error: "No documents uploaded yet." }, { status: 400 });
    }

    console.log(`📡 [GraphRAG] Active Document: ${activeDoc.fileName} (${activeDoc._id})`);

    // ── Step 1: Identify Entities in the Question ────────────────────
    const entityExtractionPrompt = `Identify the main entities (people, places, organizations, concepts) in the following question.
Return ONLY a comma-separated list of entity names.
Question: "${question}"`;

    const entityNamesStr = await callLLM("You are a linguistic expert.", entityExtractionPrompt);
    const queryEntities = entityNamesStr.split(",").map(e => e.trim()).filter(e => e.length > 0);
    
    // ── Step 2: Retrieve Related Graph Context (Scoped) ──────────────
    let graphContext = "";
    let relationshipCount = 0;
    
    if (queryEntities.length > 0) {
      // Find entities that are in the query AND in the active document
      const foundEntities = await Entity.find({
        name: { $in: queryEntities.map(name => new RegExp(`^${name}$`, "i")) },
        documents: activeDoc._id
      });

      console.log(`🔍 Entities found in query (scoped): ${foundEntities.length}`);

      if (foundEntities.length > 0) {
        const entityIds = foundEntities.map(e => e._id);
        // Find relationships connected to these entities in the active document
        const relationships = await Relationship.find({
          document: activeDoc._id,
          $or: [{ source: { $in: entityIds } }, { target: { $in: entityIds } }]
        }).populate("source target");

        relationshipCount = relationships.length;

        if (relationships.length > 0) {
          graphContext = "Related Knowledge Graph Facts:\n" + 
            relationships.map(r => `- (${r.source.name}) --[${r.relation}]--> (${r.target.name})`).join("\n");
        }
      }
    }

    // ── Step 3: Semantic Retrieval (Scoped Chunks) ───────────────────
    const questionEmbedding = await getEmbedding(question);
    const docChunks = await DocumentChunk.find({ document: activeDoc._id }).lean();

    console.log(`🧩 Total chunks searched in active document: ${docChunks.length}`);

    const scoredChunks = docChunks.map((chunk) => {
      const score = cosineSimilarity(questionEmbedding, chunk.embedding || []);
      return { content: chunk.content, score };
    });

    const topChunks = scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((c) => c.content);

    const chunkContext = topChunks.join("\n\n---\n\n");

    // ── DEBUG LOGS ──────────────────────────────────────────────────
    console.log(`📊 [Retrieval Debug] Chunks: ${topChunks.length}, Relationships: ${relationshipCount}`);

    // ── Step 4: Build Combined Prompt ───────────────────────────────
    const systemPrompt = `You are an advanced AI Knowledge Assistant. 
You answer questions using a combination of "Document Context" (raw text) and "Knowledge Graph Facts" (structured relationships).
Use the structured graph facts to understand connections between entities.
All context provided is from the SPECIFIC document the user is asking about: "${activeDoc.fileName}".
If the answer is not in the provided context, say "I couldn't find that specific information."`;

    const userMessage = `
--- KNOWLEDGE GRAPH FACTS ---
${graphContext || "No direct graph relationships found for query entities in this document."}

--- DOCUMENT TEXT CONTEXT ---
${chunkContext}

--- USER QUESTION ---
${question}

Answer the question clearly and concisely based on the above information:`;

    const answer = await callLLM(systemPrompt, userMessage);

    return NextResponse.json({
      success: true,
      answer,
      graphFactsUsed: relationshipCount,
      chunksUsed: topChunks.length,
      activeDocument: activeDoc.fileName
    });
  } catch (error) {
    console.error("❌ Query error:", error);
    return NextResponse.json(
      { error: "Failed to answer question: " + error.message },
      { status: 500 }
    );
  }
}

