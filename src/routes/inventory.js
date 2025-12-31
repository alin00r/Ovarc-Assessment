const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const inventoryService = require('../services/inventoryService');

const router = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (
      file.mimetype === 'text/csv' ||
      file.originalname.toLowerCase().endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
});

/**
 * @swagger
 * /api/inventory/upload:
 *   post:
 *     summary: Upload CSV file to ingest inventory data
 *     description: |
 *       Parse a CSV file and ingest the data into the database.
 *       - Creates new stores, authors, and books if they don't exist
 *       - If the store already stocks the specific book, increments the number of copies
 *       
 *       **CSV Format:** store_name, store_address, book_name, pages, author_name, price, logo
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file to upload (max 10MB)
 *     responses:
 *       200:
 *         description: CSV processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResult'
 *       400:
 *         description: Bad request - No file uploaded, empty file, or invalid CSV
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload a CSV file.',
      });
    }

    // Check if file has content
    if (req.file.size === 0) {
      return res.status(400).json({
        success: false,
        error: 'Uploaded file is empty.',
      });
    }

    // Process the CSV file
    const results = await inventoryService.processCSV(req.file.buffer);

    // Determine response status based on results
    const hasErrors = results.errors.length > 0;
    const hasSuccesses = results.processed > 0;

    if (!hasSuccesses && hasErrors) {
      return res.status(400).json({
        success: false,
        message: 'Failed to process any rows from the CSV file.',
        results,
      });
    }

    return res.status(200).json({
      success: true,
      message: hasErrors
        ? 'CSV processed with some errors.'
        : 'CSV processed successfully.',
      results,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
