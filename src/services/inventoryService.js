const { Store, Author, Book, StoreBook, sequelize } = require('../models');
const Piscina = require('piscina');
const path = require('path');

// Create thread pool for CSV parsing
const csvParserPool = new Piscina({
  filename: path.join(__dirname, '../workers/csvParserWorker.js'),
  minThreads: 2,
  maxThreads: 4,
  idleTimeout: 30000, // 30 seconds
});

class InventoryService {
  /**
   * Process CSV buffer using Piscina Thread Pool for parsing
   * @param {Buffer} fileBuffer - CSV file buffer
   * @returns {Object} - Processing results with success/error counts
   */
  async processCSV(fileBuffer) {
    const results = {
      processed: 0,
      created: { stores: 0, authors: 0, books: 0, inventory: 0 },
      updated: { inventory: 0 },
      errors: [],
    };

    // Parse CSV in thread pool
    const { validatedRows, validationErrors } = await csvParserPool.run({
      csvString: fileBuffer.toString(),
    });

    // Add validation errors from worker
    results.errors.push(...validationErrors);

    // Process valid rows in main thread (database operations)
    for (const { rowNumber, data } of validatedRows) {
      try {
        await this.processRow(data, results, rowNumber);
        results.processed++;
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          data: data,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get thread pool statistics
   * @returns {Object} - Pool statistics
   */
  getPoolStats() {
    return {
      threads: csvParserPool.threads.length,
      completed: csvParserPool.completed,
      waiting: csvParserPool.queueSize,
      runTime: csvParserPool.runTime,
      waitTime: csvParserPool.waitTime,
    };
  }

  /**
   * Process a single CSV row with upsert logic
   * @param {Object} row - Parsed CSV row
   * @param {Object} results - Results object to track counts
   * @param {number} rowNumber - Row number for error reporting
   */
  async processRow(row, results, rowNumber) {
    // Use transaction for data integrity
    const transaction = await sequelize.transaction();

    try {
      // 1. Find or create Store
      const [store, storeCreated] = await Store.findOrCreate({
        where: { name: row.store_name },
        defaults: {
          name: row.store_name,
          address: row.store_address || null,
          logo: row.logo || null,
        },
        transaction,
      });

      // Update store logo if provided and store exists
      if (!storeCreated && row.logo && row.logo !== store.logo) {
        await store.update({ logo: row.logo }, { transaction });
      }

      // Update store address if provided and different
      if (
        !storeCreated &&
        row.store_address &&
        row.store_address !== store.address
      ) {
        await store.update({ address: row.store_address }, { transaction });
      }

      if (storeCreated) results.created.stores++;

      // 2. Find or create Author
      const [author, authorCreated] = await Author.findOrCreate({
        where: { name: row.author_name },
        defaults: { name: row.author_name },
        transaction,
      });

      if (authorCreated) results.created.authors++;

      // 3. Find or create Book
      const [book, bookCreated] = await Book.findOrCreate({
        where: {
          name: row.book_name,
          author_id: author.id,
        },
        defaults: {
          name: row.book_name,
          pages: row.pages ? parseInt(row.pages, 10) : null,
          author_id: author.id,
        },
        transaction,
      });

      // Update pages if provided and book exists
      if (!bookCreated && row.pages) {
        const pages = parseInt(row.pages, 10);
        if (pages !== book.pages) {
          await book.update({ pages }, { transaction });
        }
      }

      if (bookCreated) results.created.books++;

      // 4. Find or create/update StoreBook (inventory)
      const price = parseFloat(row.price);
      if (isNaN(price) || price < 0) {
        throw new Error(`Invalid price value: ${row.price}`);
      }

      const existingInventory = await StoreBook.findOne({
        where: {
          store_id: store.id,
          book_id: book.id,
        },
        transaction,
      });

      if (existingInventory) {
        // Increment copies if inventory already exists
        await existingInventory.update(
          {
            copies: existingInventory.copies + 1,
            price: price, // Update price to latest
            sold_out: false, // Reset sold_out since we're adding copies
          },
          { transaction }
        );
        results.updated.inventory++;
      } else {
        // Create new inventory entry
        await StoreBook.create(
          {
            store_id: store.id,
            book_id: book.id,
            price: price,
            copies: 1,
            sold_out: false,
          },
          { transaction }
        );
        results.created.inventory++;
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new InventoryService();
