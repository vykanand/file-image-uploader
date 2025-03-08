import fs from "fs";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configure the Generative AI
const GOOGLE_API_KEY = "AIzaSyBD9pyjlKnJxykO3014VxXcp9E3BktUs4c";
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// Helper function to read image file and convert to base64
function fileToGenerativePart(path, mimeType) {
  const fileData = fs.readFileSync(path);
  return {
    inlineData: {
      data: fileData.toString("base64"),
      mimeType,
    },
  };
}

async function analyzeImage(imagePath) {
  try {
    console.log("🔍 Starting image analysis with Gemini...");

    // Make sure the file exists
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ File '${imagePath}' not found.`);
      throw new Error(`File '${imagePath}' not found.`);
    }

    console.log("✅ Found image:", imagePath);

    // Load the model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Get the correct MIME type based on file extension
    const extension = path.extname(imagePath).toLowerCase();
    const mimeType = extension === ".png" ? "image/png" : "image/jpeg";

    // Convert the image to the format required by Gemini
    const imagePart = fileToGenerativePart(imagePath, mimeType);

    console.log("📤 Sending image to Gemini model...");

    // Generate content with structured extraction prompt
    const prompt = `
      Format the response as clean JSON with these keys:
      {
        "transactionId": "",
        "amount": "",
        "dateTime": "",
        "destinationUpi": "",
        "customerInfo":""
      }
      
      Do not include any explanations or additional text.
    `;

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean up the response to ensure valid JSON
    const jsonText = text.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      return { rawText: jsonText };
    }
  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    throw error;
  }
}

export default analyzeImage;
