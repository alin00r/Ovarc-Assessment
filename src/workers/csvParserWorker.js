/**
 * Piscina Worker for parsing CSV files
 * Offloads CPU-intensive CSV parsing to thread pool
 */
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Parse CSV buffer into array of row objects
 * @param {string} csvString - CSV file content as string
 * @returns {Promise<Array>} - Array of parsed rows
 */
function parseCSV(csvString) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = Readable.from(csvString);

    stream
      .pipe(
        csv({
          mapHeaders: ({ header }) =>
            header.trim().toLowerCase().replace(/\s+/g, '_'),
          mapValues: ({ value }) => value.trim(),
        })
      )
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', (error) => reject(error));
  });
}

/**
 * Validate a CSV row has required fields
 * @param {Object} row - CSV row to validate
 * @param {number} rowNumber - Row number for error messages
 * @returns {Object} - { valid: boolean, error?: string }
 */
function validateRow(row, rowNumber) {
  const requiredFields = ['store_name', 'book_name', 'author_name', 'price'];
  const missingFields = requiredFields.filter((field) => !row[field]);

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Row ${rowNumber}: Missing required fields: ${missingFields.join(
        ', '
      )}`,
    };
  }

  // Validate price is a valid number
  const price = parseFloat(row.price);
  if (isNaN(price)) {
    return {
      valid: false,
      error: `Row ${rowNumber}: Invalid price value: ${row.price}`,
    };
  }

  // Validate pages if provided
  if (row.pages) {
    const pages = parseInt(row.pages, 10);
    if (isNaN(pages) || pages < 1) {
      return {
        valid: false,
        error: `Row ${rowNumber}: Invalid pages value: ${row.pages}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Main worker function - exported for Piscina
 * @param {Object} param0 - Worker data containing csvString
 * @returns {Promise<Object>} - Parsed and validated results
 */
module.exports = async function ({ csvString }) {
  // Parse CSV
  const rows = await parseCSV(csvString);

  // Validate all rows and separate valid/invalid
  const validatedRows = [];
  const validationErrors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because row 1 is header, and we're 0-indexed

    const validation = validateRow(row, rowNumber);

    if (validation.valid) {
      validatedRows.push({
        rowNumber,
        data: row,
      });
    } else {
      validationErrors.push({
        row: rowNumber,
        data: row,
        error: validation.error,
      });
    }
  }

  return {
    validatedRows,
    validationErrors,
    totalParsed: rows.length,
  };
};
