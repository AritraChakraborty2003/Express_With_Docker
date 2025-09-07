import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/api/v1/check-server", (req, res) => {
  res.send("Server is running");
});

// Axios endpoint to fetch data from external API
app.get("/api/v1/fetch-data", async (req, res) => {
  try {
    // Example: Fetch data from JSONPlaceholder API
    const response = await axios.get(
      "https://jsonplaceholder.typicode.com/posts/1"
    );

    res.json({
      success: true,
      message: "Data fetched successfully using axios",
      data: response.data,
      status: response.status,
    });
  } catch (error) {
    console.error("Axios error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch data",
      error: error.message,
    });
  }
});

// Axios endpoint to fetch multiple posts
app.get("/api/v1/fetch-posts", async (req, res) => {
  try {
    const limit = req.query.limit || 5;
    const response = await axios.get(
      `https://jsonplaceholder.typicode.com/posts?_limit=${limit}`
    );

    res.json({
      success: true,
      message: `Fetched ${response.data.length} posts using axios`,
      data: response.data,
      count: response.data.length,
    });
  } catch (error) {
    console.error("Axios error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts",
      error: error.message,
    });
  }
});

// Axios endpoint to make a POST request
app.post("/api/v1/create-post", async (req, res) => {
  try {
    const { title, body, userId } = req.body;

    const response = await axios.post(
      "https://jsonplaceholder.typicode.com/posts",
      {
        title: title || "Default Title",
        body: body || "Default Body",
        userId: userId || 1,
      }
    );

    res.json({
      success: true,
      message: "Post created successfully using axios",
      data: response.data,
      status: response.status,
    });
  } catch (error) {
    console.error("Axios error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create post",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
