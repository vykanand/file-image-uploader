// import fs from "fs";
// import path from "path";
// import { fileURLToPath } from "url";
// import { dirname } from "path";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// // Create __dirname equivalent for ES modules
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // Configure the Generative AI
// const GOOGLE_API_KEY = "AIzaSyBD9pyjlKnJxykO3014VxXcp9E3BktUs4c";
// const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

// // Helper function to read image file and convert to base64
// function fileToGenerativePart(path, mimeType) {
//   const fileData = fs.readFileSync(path);
//   return {
//     inlineData: {
//       data: fileData.toString("base64"),
//       mimeType,
//     },
//   };
// }

// async function analyzeImage() {
//   try {
//     console.log("🔍 Starting image analysis with Gemini...");

//     // Path to your image
//     const imagePath = path.join(__dirname, "pe.jpeg");

//     // Make sure the file exists
//     if (!fs.existsSync(imagePath)) {
//       console.error("❌ File 'pe.jpeg' not found in the root directory.");
//       return;
//     }

//     console.log("✅ Found image:", imagePath);

//     // Load the model
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

//     // Convert the image to the format required by Gemini
//     const imagePart = fileToGenerativePart(imagePath, "image/jpeg");

//     console.log("📤 Sending image to Gemini model...");

//     // Generate content with structured extraction prompt
//     const prompt = `
//       Format the response as clean JSON with these keys:
//       {
//         "transactionId": "",
//         "amount": "",
//         "dateTime": "",
//         "destinationUpi": "",
//         "customerInfo":""
//       }
      
//       Do not include any explanations or additional text.
//     `;

//     const result = await model.generateContent([prompt, imagePart]);
//     const response = await result.response;
//     const text = response.text();

//     // Clean up the response to ensure valid JSON
//     const jsonText = text.replace(/```json|```/g, "").trim();

//     console.log("\n📝 Extracted Transaction Data:");
//     console.log(jsonText);

//     // Parse and pretty-print the JSON
//     try {
//       const jsonData = JSON.parse(jsonText);
//       console.log("\n🔄 Formatted JSON:");
//       console.log(JSON.stringify(jsonData, null, 2));
//       return jsonData;
//     } catch (e) {
//       console.error("❌ Error parsing JSON:", e.message);
//       console.log("Raw text:", jsonText);
//       return jsonText;
//     }
//   } catch (error) {
//     console.error(
//       "❌ Error during image analysis:",
//       error?.message || "Unknown error"
//     );
//     if (error?.stack) {
//       console.debug("Stack trace:", error.stack);
//     }
//     throw error;
//   }
// }

// console.log("💳 Transaction Data Extractor");
// analyzeImage()
//   .then(() => console.log("✅ Extraction completed"))
//   .catch((error) =>
//     console.error("❌ Uncaught error:", error?.message || "Unknown error")
//   );





import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import axios from "axios";
import FormData from "form-data";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testOcrEndpoint() {
  try {
    console.log("🔍 Testing OCR endpoint with local image...");

    // Path to the image
    const imagePath = path.join(__dirname, "pe.jpeg");

    // Make sure the file exists
    if (!fs.existsSync(imagePath)) {
      console.error("❌ File 'pe.jpeg' not found in the root directory.");
      return;
    }

    console.log("✅ Found image:", imagePath);

    // Create form data with the image
    const formData = new FormData();
    formData.append("imageUrl", fs.createReadStream(imagePath));

    // API endpoint URL (assuming server runs locally on port 3000)
    const apiUrl = "http://localhost:3000/ocr";

    console.log("📤 Sending image to OCR endpoint...");

    // Send the request
    const response = await axios.post(apiUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    console.log("\n📝 OCR Response Status:", response.status);
    console.log("📝 OCR Result:");
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error(
      "❌ Error during OCR test:",
      error?.response?.data || error?.message || "Unknown error"
    );
    if (error?.stack) {
      console.debug("Stack trace:", error.stack);
    }
    throw error;
  }
}

console.log("🧪 OCR Endpoint Tester");
testOcrEndpoint()
  .then(() => console.log("✅ Test completed"))
  .catch((error) =>
    console.error("❌ Uncaught error:", error?.message || "Unknown error")
  );
