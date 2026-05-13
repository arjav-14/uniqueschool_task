// lib/openrouter.js
// This file handles all communication with the OpenRouter AI API.
// OpenRouter gives us access to many LLMs (like Llama) through one API.

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "meta-llama/llama-3.3-70b-instruct"; // Free tier model on OpenRouter

/**
 * Send a message to the LLM and get a response.
 *
 * @param {string} systemPrompt - Instructions for the AI (its "role")
 * @param {string} userMessage - The actual message/question
 * @returns {Promise<string>} - The AI's text response
 */
export async function callLLM(systemPrompt, userMessage) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  if (!OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is missing. Please create a file named '.env.local' in your project root and add your key there (copy from .env.local.example)."
    );
  }

  // Make a POST request to OpenRouter's chat completion endpoint
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      // OpenRouter requires this header to identify your app
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "AI Knowledge Base",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      // Keep responses focused and not too long
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} — ${errorText}`);
  }

  const data = await response.json();

  // Extract the text from the response
  return data.choices[0].message.content.trim();
}

/**
 * Generate a vector embedding for a piece of text.
 * This is used for "semantic search" (finding text by meaning).
 *
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The vector embedding (array of numbers)
 */
export async function getEmbedding(text) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is missing for embeddings.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text.replace(/\n/g, " "), // Clean up newlines for better embedding quality
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter Embedding error: ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

