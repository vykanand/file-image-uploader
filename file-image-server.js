import express from "express";
import { Client } from "@gradio/client";
import fetch from "node-fetch";
import multer from "multer";
import uploadBB from "./uploadToImgBB.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import cors from "cors";
import analyzeImage from "./gemini-ocr.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to download image from URL and save it locally
async function downloadImageFromUrl(imageUrl) {
  try {
    console.log("1. Downloading image from URL:", imageUrl);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();

    // Create a temporary file path
    const tempFilePath = path.join(
      __dirname,
      "uploads",
      `temp-${Date.now()}.jpg`
    );

    // Ensure uploads directory exists
    if (!fs.existsSync(path.join(__dirname, "uploads"))) {
      fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });
    }

    // Write the buffer to a file
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));

    console.log("Image downloaded and saved to:", tempFilePath);
    return tempFilePath;
  } catch (error) {
    console.error("Error downloading image:", error);
    throw error;
  }
}

async function tessaractOcr(imagePath) {
  try {
    console.log("Running Tesseract OCR on:", imagePath);
    const client = await Client.connect("kneelesh48/Tesseract-OCR");
    const result = await client.predict("/tesseract-ocr", {
      filepath: imagePath,
      languages: ["eng"],
    });

    return result.data;
  } catch (error) {
    console.error("Error in Tesseract OCR:", error);
    throw error;
  }
}


// Set up multer to handle file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const randomChars = Math.random().toString(36).substring(2, 6);
    const extension = path.extname(file.originalname);
    cb(null, `${randomChars}${extension}`);
  },
});

const upload = multer({ storage: storage });

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// API endpoint to upload an image
app.post("/uploadimage", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    // Call the uploadToImgBB function
    const imageUrl = await uploadBB(req.file.path);

    // Return the image URL to the client
    res.json({ imageUrl });

    // Optionally, delete the local file after uploading
    fs.unlinkSync(req.file.path);
  } catch (error) {
    console.error("Error uploading image:", error.message);
    res.status(500).send("Failed to upload image");
  }
});

// Add this endpoint after the existing /uploadimage endpoint
app.post("/uploadfiles", upload.array("files", 10), async (req, res) => {
  console.log(req.files);
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded." });
  }

  try {
    const uploadedFiles = req.files.map((file) => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
    }));

    res.json({
      message: "Files uploaded successfully",
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("Error handling files:", error);
    res.status(500).json({ error: "Failed to process files" });
  }
});

//serve multiple folders from public folder
// Define the base public directory
const publicDir = path.join(__dirname, "public");

// Read all directories under /public and serve them
if (fs.existsSync(publicDir)) {
  fs.readdirSync(publicDir).forEach((dir) => {
    const dirPath = path.join(publicDir, dir);

    if (fs.statSync(dirPath).isDirectory()) {
      const route = `/${dir}/:page`; // Dynamic route to catch specific pages
      console.log(`Serving ${dir} at ${route}`);

      app.get(route, (req, res) => {
        const page = req.params.page;
        const filePath = path.join(dirPath, page);

        // Check if file exists before sending
        if (fs.existsSync(filePath)) {
          res.sendFile(filePath);
        } else {
          res.status(404).send("Page not found");
        }
      });

      // Keep static assets serving
      app.use(`/${dir}`, express.static(dirPath));
    }
  });
}

// Serve uploads folder for downloads
// Add this BEFORE the static file serving lines
app.get("/api/files", (req, res) => {
  const files = fs.readdirSync("uploads").map((filename) => {
    const filePath = path.join("uploads", filename);
    const stats = fs.statSync(filePath);
    return {
      name: filename,
      url: `/uploads/${filename}`,
      size: stats.size,
      date: stats.mtime,
    };
  });
  res.json(files);
});

// Then keep your existing static serving
app.use("/uploads", express.static("uploads"));

// And the public folder serving
if (fs.existsSync(publicDir)) {
  fs.readdirSync(publicDir).forEach((dir) => {
    const dirPath = path.join(publicDir, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      const route = `/${dir}`;
      app.use(route, express.static(dirPath));
    }
  });
}

// Add this endpoint to handle saving editor content
app.post("/save-content", express.json({ limit: "50mb" }), (req, res) => {
  const content = req.body.content;
  fs.writeFileSync("uploads/editor-content.html", content);
  res.json({ success: true });
});

// Add endpoint to retrieve content
app.get("/get-content", (req, res) => {
  try {
    const content = fs.readFileSync("uploads/editor-content.html", "utf8");
    res.json({ content });
  } catch (error) {
    res.json({ content: "" });
  }
});



// POST endpoint for OCR processing
// Direct OCR endpoint that takes a file upload
app.post("/ocr", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    console.log("Processing direct OCR for file:", req.file.path);
    
    // Process with Gemini OCR using the uploaded file path directly
    const geminiResult = await analyzeImage(req.file.path);
    
    // Optionally clean up the file after processing
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      ocrText: JSON.stringify(geminiResult),
    });
  } catch (error) {
    console.error("Error during OCR processing:", error);
    res.status(500).json({ error: "An error occurred while processing the image" });
  }
});




// Start the server on port 3000
app.listen(3000, () => console.log("HTTP Server running on port 3000"));
