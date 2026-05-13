// app/api/chunks/route.js
// This API route returns all document chunks stored in MongoDB.

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import DocumentChunk from "@/lib/models/Chunk";

export async function GET() {
  try {
    await connectDB();
    const chunks = await DocumentChunk.find({}).sort({ createdAt: 1 }).lean();

    return NextResponse.json({
      success: true,
      chunks,
      total: chunks.length,
    });
  } catch (error) {
    console.error("❌ Chunks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document chunks: " + error.message },
      { status: 500 }
    );
  }
}
