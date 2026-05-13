"use client";
// app/page.js
// Main page of the AI Knowledge Base app.
// Contains three sections:
//   1. Upload Section  — upload a PDF or text file
//   2. Query Section   — ask a question about the document
//   3. Graph Section   — browse extracted knowledge triples

import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────
// ── SECTION 1: Upload Component
// ─────────────────────────────────────────────────────────────
import { Search, Upload, MessageSquare, Share2, Layers, RefreshCw, FileText } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// ── SECTION 1: Upload Component
// ─────────────────────────────────────────────────────────────
function UploadSection({ onUploadSuccess }) {
  const [file, setFile] = useState(null);         // Currently selected file
  const [loading, setLoading] = useState(false);  // Is upload in progress?
  const [result, setResult] = useState(null);     // Upload result message
  const [dragOver, setDragOver] = useState(false); // Is file being dragged over?
  const fileInputRef = useRef(null);

  // Handle file selection
  function handleFileChange(selectedFile) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
  }

  // Send the file to the /api/upload endpoint
  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ error: data.error || "Upload failed." });
      } else {
        setResult({ success: data.message });
        onUploadSuccess(); // Refresh graph
      }
    } catch (err) {
      setResult({ error: "Network error: " + err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card slide-in">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
        <div style={{
          width: "42px", height: "42px", borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))",
          display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-primary)"
        }}>
          <Upload size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: "17px", fontWeight: "700", color: "var(--text-primary)" }}>
            Upload Knowledge
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "2px" }}>
            PDF, TXT, DOCX, MD, JSON supported
          </p>
        </div>
      </div>

      <div
        className={`drop-zone ${dragOver ? "dragover" : ""}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFileChange(e.dataTransfer.files[0]);
        }}
      >
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>
          {file ? "📄" : "📥"}
        </div>
        <p style={{ color: "var(--text-primary)", fontWeight: "600", fontSize: "15px" }}>
          {file ? file.name : "Select or drop your file"}
        </p>
        <p style={{ color: "var(--text-dim)", fontSize: "12.5px", marginTop: "6px" }}>
          {file
            ? `${(file.size / 1024).toFixed(1)} KB`
            : "Files are processed via Graph-Aware LLM"}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => handleFileChange(e.target.files[0])}
        />
      </div>

      <button
        className="btn-primary"
        onClick={handleUpload}
        disabled={!file || loading}
        style={{ marginTop: "20px", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
      >
        {loading ? <><RefreshCw className="pulse" size={18} /> Processing Graph...</> : <><Share2 size={18} /> Extract Knowledge Graph</>}
      </button>

      {result && (
        <div className={`status-tag ${result.error ? "status-error" : "status-success"} slide-in`}
          style={{ marginTop: "16px", width: "100%", justifyContent: "center" }}>
          <span>{result.error ? "⚠️" : "✨"}</span>
          <span>{result.error || result.success}</span>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// ── SECTION 2: Query Component
// ─────────────────────────────────────────────────────────────
function QuerySection() {
  const [question, setQuestion] = useState("");   // User's question text
  const [loading, setLoading] = useState(false);  // Is query in progress?
  const [answer, setAnswer] = useState(null);     // LLM's answer
  const [error, setError] = useState(null);       // Error message

  // Send the question to /api/query
  async function handleQuery() {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer(null);
    setError(null);

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Query failed.");
      } else {
        setAnswer(data.answer);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Allow pressing Enter (without Shift) to submit the question
  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  }

  return (
    <div className="card slide-in">
      {/* Section Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "10px",
          background: "rgba(139,92,246,0.15)", display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: "18px"
        }}>💬</div>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)" }}>
            Ask a Question
          </h2>
          <p style={{ fontSize: "12.5px", color: "var(--text-dim)", marginTop: "2px" }}>
            AI answers using your document as context
          </p>
        </div>
      </div>

      {/* Question Input */}
      <textarea
        className="input-field"
        rows={3}
        placeholder="e.g. What is the main topic of this document? (Enter to submit)"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={handleKeyDown}
        id="question-input"
      />

      {/* Submit Button */}
      <button
        className="btn-primary"
        onClick={handleQuery}
        disabled={!question.trim() || loading}
        style={{ marginTop: "12px", width: "100%" }}
        id="query-btn"
      >
        {loading ? "🤔 Thinking..." : "✨ Get Answer"}
      </button>

      {/* Loading indicator */}
      {loading && (
        <div style={{ marginTop: "14px" }}>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" />
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "6px", textAlign: "center" }}>
            Searching document chunks and calling AI…
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="status-tag status-error slide-in" style={{ marginTop: "14px" }}>
          <span>❌</span><span>{error}</span>
        </div>
      )}

      {/* AI Answer */}
      {answer && (
        <div style={{ marginTop: "18px" }} className="slide-in">
          <p className="section-label">AI Answer</p>
          <div className="answer-box">{answer}</div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ── SECTION 3: Knowledge Graph Component
// ─────────────────────────────────────────────────────────────
import GraphView from "./components/GraphView";

// ─────────────────────────────────────────────────────────────
// ── SECTION 3: Knowledge Graph Component
// ─────────────────────────────────────────────────────────────
function GraphSection({ refreshTrigger }) {
  const [data, setData] = useState({ nodes: [], edges: [], triples: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchGraph();
  }, [refreshTrigger]);

  async function fetchGraph() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/graph");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load graph");
      } else {
        setData(data);
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredTriples = (data.triples || []).filter((t) => {
    const q = search.toLowerCase();
    return (
      t.subject?.toLowerCase().includes(q) ||
      t.relation?.toLowerCase().includes(q) ||
      t.object?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="card slide-in" style={{ gridColumn: "span 2" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "12px",
            background: "rgba(16,185,129,0.15)", display: "flex",
            alignItems: "center", justifyContent: "center", color: "var(--accent-green)"
          }}>
            <Share2 size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
              Interactive Knowledge Graph
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-dim)", marginTop: "2px" }}>
              {(data.nodes || []).length} entities and {(data.edges || []).length} relationships
            </p>
          </div>
        </div>

        <button
          onClick={fetchGraph}
          disabled={loading}
          className="btn-primary"
          style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.25)",
            color: "#34d399",
            padding: "8px 16px",
          }}
        >
          {loading ? "⟳ Loading…" : "⟳ Refresh Graph"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
        {/* Visual Graph */}
        <div>
          <GraphView initialNodes={data.nodes} initialEdges={data.edges} />
        </div>

        {/* Triple List */}
        <div>
          <div style={{ marginBottom: "16px" }}>
            <input
              className="input-field"
              placeholder="🔍 Filter facts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: "13px" }}
            />
          </div>

          <div style={{ maxHeight: "440px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "8px" }}>
            {filteredTriples.map((triple, idx) => (
              <div key={triple._id || idx} className="triple-row" style={{ padding: "10px 14px", fontSize: "12px" }}>
                <span className="triple-badge badge-subject">{triple.subject}</span>
                <span style={{ color: "var(--text-dim)" }}>→</span>
                <span className="triple-badge badge-relation">{triple.relation}</span>
                <span style={{ color: "var(--text-dim)" }}>→</span>
                <span className="triple-badge badge-object">{triple.object}</span>
              </div>
            ))}
            {filteredTriples.length === 0 && !loading && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>
                <p>No facts extracted yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}




// ─────────────────────────────────────────────────────────────
// ── ROOT PAGE — Assembles all four sections
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// ── ROOT PAGE — Assembles all four sections
// ─────────────────────────────────────────────────────────────
export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleUploadSuccess() {
    setRefreshKey((prev) => prev + 1);
  }

  return (
    <main style={{ minHeight: "100vh", padding: "0 0 60px", background: "radial-gradient(circle at top right, #1a1d2e, #0f1117)" }}>

      {/* ── Hero Header ── */}
      <header style={{
        borderBottom: "1px solid var(--border-color)",
        padding: "20px 60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(15,17,23,0.8)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{
            width: "44px", height: "44px", borderRadius: "14px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 20px rgba(99,102,241,0.3)",
          }}>
             <Layers color="white" size={24} />
          </div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.02em" }}>
              GraphRAG Knowledge Base
            </h1>
            <p style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: "500" }}>
              Advanced Entity-Relationship Retrieval · Llama 3.3
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
           <div className="status-tag" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#6366f1" }}></span>
              <span style={{ fontSize: "11px", fontWeight: "600", color: "#818cf8" }}>GraphRAG Engine Active</span>
           </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div style={{
        maxWidth: "1600px",
        margin: "0 auto",
        padding: "40px",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "32px",
      }}>

        {/* Top Row */}
        <UploadSection onUploadSuccess={handleUploadSuccess} />
        <QuerySection />

        {/* Middle Row: Graph (Full Width) */}
        <GraphSection refreshTrigger={refreshKey} />

        {/* Bottom Row */}
        <div className="card slide-in" style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: "20px", padding: "40px" }}>
           <div style={{ padding: "24px", borderRadius: "20px", background: "rgba(99,102,241,0.1)", color: "var(--accent-primary)" }}>
              <FileText size={48} />
           </div>
           <div>
              <h3 style={{ fontSize: "22px", fontWeight: "800" }}>Intelligent Graph Intelligence</h3>
              <p style={{ fontSize: "15px", color: "var(--text-dim)", maxWidth: "500px", margin: "12px auto", lineHeight: "1.6" }}>
                 Our system uses GraphRAG to cross-reference document segments with extracted entities. This creates a multi-layered semantic index that provides more accurate, connected, and context-aware answers than traditional search.
              </p>
           </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ textAlign: "center", color: "var(--text-dim)", fontSize: "13px", padding: "40px 0", borderTop: "1px solid var(--border-color)", margin: "0 40px" }}>
        <p>Built with Next.js 16 · MongoDB · React Flow · OpenRouter</p>
      </footer>
    </main>
  );
}


