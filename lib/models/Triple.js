// lib/models/Triple.js
// Mongoose model for storing knowledge graph triples.
// A triple represents a fact: (subject) --[relation]--> (object)
// Example: (Albert Einstein, was born in, Germany)

import mongoose from "mongoose";

// Define the shape of a triple in MongoDB
const TripleSchema = new mongoose.Schema({
  // Who or what the fact is about
  subject: {
    type: String,
    required: true,
  },
  // The relationship between subject and object
  relation: {
    type: String,
    required: true,
  },
  // The value or entity connected to the subject
  object: {
    type: String,
    required: true,
  },
  // When this triple was extracted
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Export the model — guard against re-definition during hot reload
export default mongoose.models.Triple ||
  mongoose.model("Triple", TripleSchema);
