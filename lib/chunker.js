// lib/chunker.js
// Splits a large block of text into smaller chunks (about 500 words each).
// This makes it easier for the AI to process and find relevant sections.

/**
 * Split text into chunks of roughly `maxWords` words each.
 * We split on sentences to avoid cutting mid-sentence.
 *
 * @param {string} text - The full document text
 * @param {number} maxWords - Maximum words per chunk (default: 500)
 * @returns {string[]} - Array of text chunks
 */
export function chunkText(text, maxWords = 500) {
  // Step 1: Clean up extra whitespace and line breaks
  const cleaned = text.replace(/\s+/g, " ").trim();

  // Step 2: Split on sentence endings (. ! ?)
  // This keeps sentences together so chunks make more sense
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];

  const chunks = [];
  let currentChunk = "";
  let wordCount = 0;

  for (const sentence of sentences) {
    // Count words in this sentence
    const sentenceWords = sentence.trim().split(" ").length;

    // If adding this sentence would exceed limit, save current chunk and start new
    if (wordCount + sentenceWords > maxWords && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      wordCount = sentenceWords;
    } else {
      // Otherwise, add this sentence to the current chunk
      currentChunk += " " + sentence;
      wordCount += sentenceWords;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
