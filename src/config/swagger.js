const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digital Bookstore Inventory API',
      version: '1.0.0',
      description:
        'A Node.js/Express backend for managing bookstore inventory through CSV uploads and generating PDF reports.',
      contact: {
        name: 'Ali Nour',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Inventory',
        description: 'Inventory management endpoints',
      },
      {
        name: 'Store',
        description: 'Store management and reporting endpoints',
      },
    ],
    components: {
      schemas: {
        Store: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Store ID',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Store name',
              example: 'BookWorld',
            },
            address: {
              type: 'string',
              description: 'Store address',
              example: '123 Main St',
            },
            logo: {
              type: 'string',
              description: 'Store logo URL or base64',
              example: 'https://example.com/logo.png',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Author: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Author ID',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Author name',
              example: 'F. Scott Fitzgerald',
            },
          },
        },
        Book: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Book ID',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Book name',
              example: 'The Great Gatsby',
            },
            pages: {
              type: 'integer',
              description: 'Number of pages',
              example: 180,
            },
            author_id: {
              type: 'integer',
              description: 'Author ID',
              example: 1,
            },
          },
        },
        UploadResult: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'CSV processed successfully.',
            },
            results: {
              type: 'object',
              properties: {
                processed: {
                  type: 'integer',
                  description: 'Number of rows processed',
                  example: 5,
                },
                created: {
                  type: 'object',
                  properties: {
                    stores: { type: 'integer', example: 1 },
                    authors: { type: 'integer', example: 3 },
                    books: { type: 'integer', example: 5 },
                    inventory: { type: 'integer', example: 5 },
                  },
                },
                updated: {
                  type: 'object',
                  properties: {
                    inventory: { type: 'integer', example: 0 },
                  },
                },
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      row: { type: 'integer' },
                      data: { type: 'object' },
                      error: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
