// lib/models/Chunk.js
// Mongoose model for storing document text chunks.
// Each chunk is a portion of the uploaded document.

import mongoose from "mongoose";

// Define the shape of a document chunk in MongoDB
const ChunkSchema = new mongoose.Schema({
  // The actual text content of this chunk
  content: {
    type: String,
    required: true,
  },
  // Vector embedding of the chunk text for semantic search
  embedding: {
    type: [Number],
    default: [],
  },
  // Reference to the source document
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
  },
  // When this chunk was created
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the model — check if it already exists to avoid re-defining in dev (hot reload)
export default mongoose.models.DocumentChunk ||
  mongoose.model("DocumentChunk", ChunkSchema);
