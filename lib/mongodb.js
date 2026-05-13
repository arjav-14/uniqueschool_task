// lib/mongodb.js
// This file handles connecting to MongoDB.
// We cache the connection so we don't reconnect on every API call.

import mongoose from "mongoose";

// Cache the connection across API route calls in development
let cached = global._mongooseCache;

if (!cached) {
  cached = global._mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  // Read the URI from environment variables
  let MONGODB_URI = process.env.MONGODB_URI;

  // FALLBACK: If not defined, use a local default to be beginner-friendly.
  // This allows the app to work "out of the box" if a local Mongo is running.
  if (!MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI not found in .env.local. Falling back to local default.");
    MONGODB_URI = "mongodb://localhost:27017/ai_knowledgebase";
  }

  // If already connected, return the existing connection
  if (cached.conn) {
    return cached.conn;
  }

  // If no pending connection, start a new one
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => {
      console.log("✅ MongoDB connected");
      return m;
    });
  }

  // Wait for the connection to finish
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectDB;
