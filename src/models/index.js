const { Sequelize } = require('sequelize');
require('dotenv').config();

// Use DATABASE_URL if available, otherwise fall back to individual config
const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    })
  : (() => {
      const config = require('../config/database');
      const env = process.env.NODE_ENV || 'development';
      const dbConfig = config[env];
      return new Sequelize(
        dbConfig.database,
        dbConfig.username,
        dbConfig.password,
        {
          host: dbConfig.host,
          port: dbConfig.port,
          dialect: dbConfig.dialect,
          logging: dbConfig.logging,
          pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
          },
        }
      );
    })();

// Import models
const Store = require('./Store')(sequelize);
const Author = require('./Author')(sequelize);
const Book = require('./Book')(sequelize);
const StoreBook = require('./StoreBook')(sequelize);

// Define associations
// Author - Book (One-to-Many)
Author.hasMany(Book, { foreignKey: 'author_id', as: 'books' });
Book.belongsTo(Author, { foreignKey: 'author_id', as: 'author' });

// Store - Book (Many-to-Many through StoreBook)
Store.belongsToMany(Book, {
  through: StoreBook,
  foreignKey: 'store_id',
  otherKey: 'book_id',
  as: 'books',
});
Book.belongsToMany(Store, {
  through: StoreBook,
  foreignKey: 'book_id',
  otherKey: 'store_id',
  as: 'stores',
});

// Direct associations to StoreBook for easier queries
Store.hasMany(StoreBook, { foreignKey: 'store_id', as: 'storeBooks' });
StoreBook.belongsTo(Store, { foreignKey: 'store_id', as: 'store' });

Book.hasMany(StoreBook, { foreignKey: 'book_id', as: 'storeBooks' });
StoreBook.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

module.exports = {
  sequelize,
  Sequelize,
  Store,
  Author,
  Book,
  StoreBook,
};
