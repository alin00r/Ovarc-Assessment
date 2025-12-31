/**
 * Database sync script
 * Run with: npm run db:sync
 */
require('dotenv').config();

const { sequelize } = require('../models');

const syncDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Database connection established.');

    console.log('Syncing database tables...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✓ Database synchronized successfully.');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error syncing database:', error.message);
    process.exit(1);
  }
};

syncDatabase();
