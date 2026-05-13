import mongoose from "mongoose";

const EntitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  type: {
    type: String, // e.g., Person, Organization, Concept
    default: "General",
  },
  description: {
    type: String,
    default: "",
  },
  embedding: {
    type: [Number],
    default: [],
  },
  // Track which documents this entity appears in
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Entity || mongoose.model("Entity", EntitySchema);
