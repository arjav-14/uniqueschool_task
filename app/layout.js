// app/layout.js
// The root layout wraps every page in the app.
// It sets up global fonts, metadata, and the overall page shell.

import { Geist } from "next/font/google";
import "./globals.css";

// Load the Geist font from Google Fonts — clean and modern
const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  title: "AI Knowledge Base",
  description: "Upload a document, ask questions, and explore your knowledge graph — powered by AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        {children}
      </body>
    </html>
  );
}
