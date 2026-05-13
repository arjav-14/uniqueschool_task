import mongoose from "mongoose";

const RelationshipSchema = new mongoose.Schema({
  source: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Entity",
    required: true,
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Entity",
    required: true,
  },
  relation: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.Relationship || mongoose.model("Relationship", RelationshipSchema);
