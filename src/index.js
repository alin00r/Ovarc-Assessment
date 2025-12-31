require('dotenv').config();

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { sequelize } = require('./models');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Bookstore API Documentation',
  })
);

// Serve swagger.json
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.originalUrl}`
    );
    next();
  });
}

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Digital Bookstore Inventory API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: 'GET /api/health',
      uploadInventory: 'POST /api/inventory/upload',
      downloadStoreReport: 'GET /api/store/:id/download-report',
      getStore: 'GET /api/store/:id',
      getAllStores: 'GET /api/store',
    },
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.');

    // Sync database (create tables if they don't exist)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✓ Database synchronized.');

    // Start listening
    app.listen(PORT, () => {
      console.log(`✓ Server is running on http://localhost:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('✗ Unable to start server:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
