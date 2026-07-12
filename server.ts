import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware
  app.use(express.json());

  // Dictionary lookup endpoint (supports both GET and POST)
  const handleDictionaryLookup = async (req: express.Request, res: express.Response): Promise<void> => {
    const wordParam = req.query.word || req.body.word;
    const word = typeof wordParam === "string" ? wordParam.trim() : "";

    if (!word) {
      res.status(400).json({ error: "No word specified" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing on the server.");
      res.status(500).json({
        error: "Le dictionnaire intelligent est temporairement indisponible (clé API non configurée côté serveur)."
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const prompt = `Translate and analyze the word or expression: "${word}". Translate it from English to French or French to English, auto-detecting the source language.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: 
            "You are an expert bilingual lexicographer. Your task is to translate and analyze the given word/expression.\n" +
            "1. Detect the source language. If French, translate to English. If English, translate to French.\n" +
            "2. Provide up to 4 translation candidates sorted by relevance/quality.\n" +
            "3. For each candidate, generate a very short natural example sentence (maximum 15 words) in the target language showing its usage.\n" +
            "4. Classify the Part of Speech (pos) of the input word. It MUST be one of: 'n', 'v', 'adj', 'adv', 'phrasal_v', 'expr', 'prep', 'conj', 'pron', 'interj'. If uncertain, use 'expr'.\n" +
            "5. Estimate the register of the input word. It MUST be one of: 'neutral', 'conversational', 'academic'.\n" +
            "6. Always return a valid JSON object matching the requested schema. Do not include markdown formatting or backticks outside the json structure.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sourceLanguage: {
                type: Type.STRING,
                description: "The detected language of the input: 'en' or 'fr'."
              },
              candidates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: {
                      type: Type.STRING,
                      description: "The translation candidate in the target language."
                    },
                    example: {
                      type: Type.STRING,
                      description: "A short, natural example sentence in the target language (max 15 words)."
                    }
                  },
                  required: ["word", "example"]
                },
                description: "Up to 4 translation candidates, ranked by relevance."
              },
              pos: {
                type: Type.STRING,
                description: "Part of speech of the input word: 'n', 'v', 'adj', 'adv', 'phrasal_v', 'expr', 'prep', 'conj', 'pron', 'interj'."
              },
              register: {
                type: Type.STRING,
                description: "Estimated register: 'neutral', 'conversational', 'academic'."
              }
            },
            required: ["sourceLanguage", "candidates", "pos", "register"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini.");
      }

      // Parse and return the JSON
      const parsedData = JSON.parse(responseText.trim());
      res.json(parsedData);
    } catch (error: any) {
      console.error("Gemini API dictionary lookup failed:", error);
      res.status(500).json({
        error: "Erreur lors de l'appel au service de traduction. Veuillez réessayer."
      });
    }
  };

  // Mount API endpoints
  app.get("/api/dictionary", (req, res, next) => {
    handleDictionaryLookup(req, res).catch(next);
  });
  app.post("/api/dictionary", (req, res, next) => {
    handleDictionaryLookup(req, res).catch(next);
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Setup static/vite middleware depending on environment
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA routing: send index.html for all other requests
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://0.0.0.0:${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
