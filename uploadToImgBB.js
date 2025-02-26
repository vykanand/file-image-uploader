import axios from "axios";
import fs from "fs";
import FormData from "form-data";

// Function to upload an image to ImgBB
const uploadBB = async (imagePath) => {
  const apiKey = "a44a6352445eaa78a9233b5e03f860d3"; // Replace with your ImgBB API key

  try {
    // Create a form data object and append the image file as a stream
    const formData = new FormData();
    formData.append("image", fs.createReadStream(imagePath)); // Use read stream to upload the file

    // Make the API request to ImgBB
    const response = await axios.post(
      `https://api.imgbb.com/1/upload?key=${apiKey}`,
      formData, // Send form data containing the image
      { headers: formData.getHeaders() } // Include proper headers
    );
    console.log(response.data?.data?.url);
    // Check for successful response
    if (response.data?.data?.url) {
      return response.data.data.url; // Return the image URL
    } else {
      throw new Error("Failed to upload image");
    }
  } catch (error) {
    console.error("Error uploading image:", error.message);
    throw error; // Rethrow error for handling in higher context
  }
};

export default uploadBB;
