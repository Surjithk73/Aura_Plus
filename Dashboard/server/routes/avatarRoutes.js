const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../public/models');
    console.log('Upload directory:', uploadDir);
    
    try {
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        console.log('Creating upload directory...');
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'avatar-' + uniqueSuffix + '.glb';
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

// File filter to only allow .glb files
const fileFilter = (req, file, cb) => {
  console.log('Received file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  if (file.mimetype === 'model/gltf-binary' || file.originalname.endsWith('.glb')) {
    console.log('File type accepted');
    cb(null, true);
  } else {
    console.log('File type rejected');
    cb(new Error('Only .glb files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
}).single('avatar');

// Upload avatar endpoint
router.post('/upload', (req, res) => {
  console.log('Received upload request');
  
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('Other upload error:', err);
      return res.status(400).json({ error: err.message });
    }

    try {
      if (!req.file) {
        console.error('No file received');
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log('File uploaded successfully:', {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      });

      // Return the path relative to the public directory
      const relativePath = '/models/' + req.file.filename;
      res.json({ path: relativePath });
    } catch (error) {
      console.error('Error processing upload:', error);
      res.status(500).json({ error: 'Failed to process uploaded file' });
    }
  });
});

module.exports = router; 