import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config(); // Also load .env as fallback

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY not set in environment or .env file");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  try {
    const models = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      .apiKey; // Hack: accessing internal property or just verifying auth? Use listModels on client?
    // The SDK documentation says listModels is on the client instance?
    // Actually, looking at the source or docs, it's often directly unrelated to a specific model.
    // Wait, the GoogleGenerativeAI class doesn't have listModels?
    // The error message says "Call ListModels to see the list...".
    // In the Node SDK, it's not always exposed directly on `GoogleGenerativeAI`.
    // Let's try hitting the REST API directly or checking if the SDK has it.

    // Actually, the SDK *does* seem to have `getGenerativeModel`, but `listModels` might not be in the helper class.
    // However, we can construct the URL.

    console.log("Fetching models using direct API call...");
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`,
    );
    const data = await response.json();

    if (data.models) {
      console.log("Available Models:");
      data.models.forEach((m) => {
        console.log(`- ${m.name} (${m.displayName})`);
        console.log(
          `  Supported methods: ${m.supportedGenerationMethods.join(", ")}`,
        );
      });
    } else {
      console.log("No models found or error structure:", data);
    }
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
