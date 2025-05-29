// server.js (in a separate 'backend' directory)
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 5000; // Choose a port for your backend

// Create an 'uploads' directory if it doesn't exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

app.use(cors()); // Enable CORS for your React app
app.use(express.json()); // To parse JSON bodies

// Route to handle file uploads
app.post("/upload", upload.single("mediaFile"), (req, res) => {
  if (req.file) {
    console.log("File uploaded:", req.file.filename);
    res.status(200).json({
      message: "File uploaded successfully!",
      filename: req.file.filename,
      url: `http://localhost:${port}/uploads/${req.file.filename}`,
    });
  } else {
    res.status(400).json({ message: "No file uploaded." });
  }
});

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static(uploadDir));

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
