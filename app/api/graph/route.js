// app/api/graph/route.js
// This API route returns all the knowledge graph triples stored in MongoDB.
// A triple is a fact in the form: (subject, relation, object)

import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Document from "@/lib/models/Document";
import Entity from "@/lib/models/Entity";
import Relationship from "@/lib/models/Relationship";

export async function GET() {
  try {
    await connectDB();

    // ── Step 0: Identify Active Document ───────────────────────────
    const activeDoc = await Document.findOne().sort({ createdAt: -1 });

    if (!activeDoc) {
      return NextResponse.json({ nodes: [], edges: [], triples: [] });
    }

    console.log(`🌐 [Graph API] Visualizing data for: ${activeDoc.fileName}`);

    // ── Step 1: Fetch Scoped Data ──────────────────────────────────
    const entities = await Entity.find({ documents: activeDoc._id }).lean();
    const relationships = await Relationship.find({ document: activeDoc._id }).populate("source target").lean();

    console.log(`📊 [Graph Stats] Entities: ${entities.length}, Relationships: ${relationships.length}`);

    // Map entities to React Flow nodes
    const nodes = entities.map((ent, index) => ({
      id: ent._id.toString(),
      data: { label: ent.name, type: ent.type, description: ent.description },
      // Simple random/grid positioning (client side can improve this)
      position: { x: Math.random() * 800, y: Math.random() * 600 },
      className: "graph-node",
    }));

    // Map relationships to React Flow edges
    const edges = relationships.map((rel) => ({
      id: rel._id.toString(),
      source: rel.source._id.toString(),
      target: rel.target._id.toString(),
      label: rel.relation,
      animated: true,
      className: "graph-edge",
    }));

    return NextResponse.json({
      success: true,
      nodes,
      edges,
      // Still return triples for the list view compatibility
      triples: relationships.map(r => ({
        _id: r._id,
        subject: r.source.name,
        relation: r.relation,
        object: r.target.name
      }))
    });
  } catch (error) {
    console.error("❌ Graph fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch knowledge graph: " + error.message },
      { status: 500 }
    );
  }
}

