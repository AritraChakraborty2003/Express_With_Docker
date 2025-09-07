import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import sharp from "sharp";
import nodemailer from "nodemailer";

dotenv.config();

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// In-memory storage for demo purposes
const users = [];
const posts = [];

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

// User Registration with bcrypt password hashing
app.post("/api/v1/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    // Check if user already exists
    const existingUser = users.find((user) => user.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user with UUID
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
});

// User Login with bcrypt password verification
app.post("/api/v1/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = users.find((u) => u.email === email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Verify password using bcrypt
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
});

// File upload endpoint with multer and image processing with sharp
app.post("/api/v1/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    // Process image with sharp (resize, optimize)
    const processedImage = await sharp(buffer)
      .resize(800, 600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Generate unique filename with UUID
    const fileExtension = originalname.split(".").pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;

    // In a real app, you'd save this to a file system or cloud storage
    // For demo, we'll just return the processed image info
    res.json({
      success: true,
      message: "Image processed and uploaded successfully",
      fileInfo: {
        originalName: originalname,
        uniqueName: uniqueFilename,
        mimeType: mimetype,
        originalSize: buffer.length,
        processedSize: processedImage.length,
        compressionRatio:
          (
            ((buffer.length - processedImage.length) / buffer.length) *
            100
          ).toFixed(2) + "%",
      },
    });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({
      success: false,
      message: "Image upload failed",
      error: error.message,
    });
  }
});

// Email sending endpoint with nodemailer
app.post("/api/v1/send-email", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({
        success: false,
        message: "To, subject, and text are required",
      });
    }

    // Create transporter (you'll need to configure with real SMTP settings)
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "your-email@gmail.com",
        pass: process.env.SMTP_PASS || "your-app-password",
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.SMTP_USER || "your-email@gmail.com",
      to: to,
      subject: subject,
      text: text,
      html: html || text,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    });
  } catch (error) {
    console.error("Email error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
    });
  }
});

// Protected route example with JWT verification
app.get("/api/v1/profile", (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token required",
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );
    const user = users.find((u) => u.id === decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "Profile retrieved successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile error:", error.message);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error.message,
    });
  }
});

// Data processing endpoint with UUID generation
app.post("/api/v1/process-data", (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: "Data array is required",
      });
    }

    // Process data and add UUIDs
    const processedData = data.map((item, index) => ({
      id: uuidv4(),
      originalIndex: index,
      data: item,
      processedAt: new Date().toISOString(),
      status: "processed",
    }));

    res.json({
      success: true,
      message: `Processed ${processedData.length} items successfully`,
      processedData,
      summary: {
        totalItems: processedData.length,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Data processing error:", error.message);
    res.status(500).json({
      success: false,
      message: "Data processing failed",
      error: error.message,
    });
  }
});

// Logout endpoint
app.post("/api/v1/logout", (req, res) => {
  res.clearCookie("token");
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
