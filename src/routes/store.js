const express = require('express');
const { param, validationResult } = require('express-validator');
const reportService = require('../services/reportService');
const { Store } = require('../models');

const router = express.Router();

/**
 * @swagger
 * /api/store/{id}/download-report:
 *   get:
 *     summary: Download PDF report for a specific store
 *     description: |
 *       Generate and download a PDF report for the specified store.
 *       The report includes:
 *       - Store logo and name
 *       - Top 5 Priciest Books (highest prices)
 *       - Top 5 Prolific Authors (greatest number of available books)
 *
 *       File is named: [Store-Name]-Report-YYYY-MM-DD.pdf
 *     tags: [Store]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Store ID
 *     responses:
 *       200:
 *         description: PDF report file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid store ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id/download-report',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Store ID must be a positive integer'),
  ],
  async (req, res, next) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const storeId = parseInt(req.params.id, 10);

      // Check if store exists
      const store = await Store.findByPk(storeId);
      if (!store) {
        return res.status(404).json({
          success: false,
          error: `Store with ID ${storeId} not found.`,
        });
      }

      // Generate PDF report
      const { buffer, filename } = await reportService.generateStoreReport(
        storeId
      );

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
      );
      res.setHeader('Content-Length', buffer.length);

      // Send PDF buffer
      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/store/{id}:
 *   get:
 *     summary: Get store details
 *     description: Retrieve details for a specific store by ID
 *     tags: [Store]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Store'
 *       400:
 *         description: Invalid store ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Store not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/:id',
  [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Store ID must be a positive integer'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const storeId = parseInt(req.params.id, 10);
      const store = await Store.findByPk(storeId);

      if (!store) {
        return res.status(404).json({
          success: false,
          error: `Store with ID ${storeId} not found.`,
        });
      }

      return res.json({
        success: true,
        data: store,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/store:
 *   get:
 *     summary: Get all stores
 *     description: Retrieve a list of all stores
 *     tags: [Store]
 *     responses:
 *       200:
 *         description: List of stores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Store'
 *                 count:
 *                   type: integer
 *                   example: 3
 */
router.get('/', async (req, res, next) => {
  try {
    const stores = await Store.findAll({
      order: [['name', 'ASC']],
    });

    return res.json({
      success: true,
      data: stores,
      count: stores.length,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
