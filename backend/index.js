import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import moment from "moment";

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

// File upload endpoint with multer
app.post("/api/v1/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const { buffer, originalname, mimetype } = req.file;

    // No image processing - just return file info

    // Generate unique filename with UUID
    const fileExtension = originalname.split(".").pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;

    // In a real app, you'd save this to a file system or cloud storage
    // For demo, we'll just return the processed image info
    res.json({
      success: true,
      message: "Image uploaded successfully",
      fileInfo: {
        originalName: originalname,
        uniqueName: uniqueFilename,
        mimeType: mimetype,
        fileSize: buffer.length,
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

// PDF download endpoint using PDFKit
app.get("/api/v1/download-hello-pdf", (req, res) => {
  try {
    // Create a new PDF document
    const doc = new PDFDocument();

    // Set response headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="hello.pdf"');

    // Pipe the PDF to the response
    doc.pipe(res);

    // Add content to the PDF
    doc.fontSize(24).text("Hello World!", 100, 100);

    doc
      .fontSize(16)
      .text("This is a simple PDF generated using PDFKit.", 100, 150);

    doc
      .fontSize(12)
      .text("Generated on: " + new Date().toLocaleString(), 100, 200);

    // Add some styling
    doc.rect(50, 50, 500, 200).stroke();

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
      error: error.message,
    });
  }
});

// Date/Time manipulation endpoint using moment.js
app.get("/api/v1/date-time", (req, res) => {
  try {
    const { format, timezone, operation } = req.query;

    // Get current time
    const now = moment();

    // Default response with various date formats
    const dateInfo = {
      current: {
        iso: now.toISOString(),
        formatted: now.format("YYYY-MM-DD HH:mm:ss"),
        unix: now.unix(),
        human: now.fromNow(),
        dayOfWeek: now.format("dddd"),
        dayOfYear: now.dayOfYear(),
        weekOfYear: now.week(),
        quarter: now.quarter(),
      },
      formats: {
        default: now.format(),
        dateOnly: now.format("YYYY-MM-DD"),
        timeOnly: now.format("HH:mm:ss"),
        readable: now.format("MMMM Do YYYY, h:mm:ss a"),
        short: now.format("MMM D, YYYY"),
        long: now.format("dddd, MMMM Do YYYY, h:mm:ss a"),
      },
      calculations: {
        startOfDay: now.clone().startOf("day").format(),
        endOfDay: now.clone().endOf("day").format(),
        startOfWeek: now.clone().startOf("week").format(),
        endOfWeek: now.clone().endOf("week").format(),
        startOfMonth: now.clone().startOf("month").format(),
        endOfMonth: now.clone().endOf("month").format(),
        startOfYear: now.clone().startOf("year").format(),
        endOfYear: now.clone().endOf("year").format(),
      },
      timezone: {
        utc: now.utc().format(),
        local: now.local().format(),
        offset: now.format("Z"),
      },
    };

    // Handle custom format if provided
    if (format) {
      dateInfo.customFormat = now.format(format);
    }

    // Handle timezone conversion if provided
    if (timezone) {
      dateInfo.timezoneConversion = {
        original: now.format(),
        converted: now.tz(timezone).format(),
        timezone: timezone,
      };
    }

    // Handle specific operations
    if (operation) {
      switch (operation) {
        case "add":
          const addValue = req.query.value || "1";
          const addUnit = req.query.unit || "day";
          dateInfo.operation = {
            type: "add",
            value: addValue,
            unit: addUnit,
            result: now.clone().add(parseInt(addValue), addUnit).format(),
          };
          break;
        case "subtract":
          const subValue = req.query.value || "1";
          const subUnit = req.query.unit || "day";
          dateInfo.operation = {
            type: "subtract",
            value: subValue,
            unit: subUnit,
            result: now.clone().subtract(parseInt(subValue), subUnit).format(),
          };
          break;
        case "diff":
          const compareDate =
            req.query.compare || now.clone().subtract(1, "day").format();
          dateInfo.operation = {
            type: "difference",
            compareDate: compareDate,
            difference: {
              days: now.diff(moment(compareDate), "days"),
              hours: now.diff(moment(compareDate), "hours"),
              minutes: now.diff(moment(compareDate), "minutes"),
              seconds: now.diff(moment(compareDate), "seconds"),
            },
          };
          break;
      }
    }

    res.json({
      success: true,
      message:
        "Date and time information retrieved successfully using moment.js",
      timestamp: now.toISOString(),
      data: dateInfo,
      package: "moment",
      version: "2.30.1",
    });
  } catch (error) {
    console.error("Date/Time endpoint error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to process date/time request",
      error: error.message,
    });
  }
});

// Advanced date operations endpoint
app.post("/api/v1/date-operations", (req, res) => {
  try {
    const { dates, operations } = req.body;

    if (!dates || !Array.isArray(dates)) {
      return res.status(400).json({
        success: false,
        message: "Dates array is required",
      });
    }

    const results = dates.map((dateString, index) => {
      const date = moment(dateString);

      if (!date.isValid()) {
        return {
          index,
          input: dateString,
          error: "Invalid date format",
        };
      }

      const result = {
        index,
        input: dateString,
        parsed: date.format(),
        isValid: date.isValid(),
        formats: {
          iso: date.toISOString(),
          readable: date.format("MMMM Do YYYY, h:mm:ss a"),
          short: date.format("MMM D, YYYY"),
          time: date.format("HH:mm:ss"),
        },
        properties: {
          dayOfWeek: date.format("dddd"),
          dayOfYear: date.dayOfYear(),
          weekOfYear: date.week(),
          quarter: date.quarter(),
          isLeapYear: date.isLeapYear(),
          daysInMonth: date.daysInMonth(),
        },
      };

      // Apply operations if provided
      if (operations && operations[index]) {
        const ops = operations[index];
        result.operations = {};

        if (ops.add) {
          result.operations.add = date
            .clone()
            .add(ops.add.value, ops.add.unit)
            .format();
        }
        if (ops.subtract) {
          result.operations.subtract = date
            .clone()
            .subtract(ops.subtract.value, ops.subtract.unit)
            .format();
        }
        if (ops.startOf) {
          result.operations.startOf = date
            .clone()
            .startOf(ops.startOf)
            .format();
        }
        if (ops.endOf) {
          result.operations.endOf = date.clone().endOf(ops.endOf).format();
        }
      }

      return result;
    });

    res.json({
      success: true,
      message: `Processed ${results.length} dates successfully using moment.js`,
      results,
      summary: {
        totalDates: results.length,
        validDates: results.filter((r) => r.isValid).length,
        invalidDates: results.filter((r) => !r.isValid).length,
        processedAt: moment().toISOString(),
      },
    });
  } catch (error) {
    console.error("Date operations error:", error.message);
    res.status(500).json({
      success: false,
      message: "Date operations failed",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
