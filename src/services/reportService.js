const PDFDocument = require('pdfkit');
const { Store, Author, Book, StoreBook, sequelize } = require('../models');

class ReportService {
  /**
   * Generate a PDF report for a specific store
   * @param {number} storeId - Store ID
   * @returns {Promise<{buffer: Buffer, filename: string}>} - PDF buffer and filename
   */
  async generateStoreReport(storeId) {
    // Fetch store data
    const store = await Store.findByPk(storeId);
    if (!store) {
      throw new Error('Store not found');
    }

    // Get top 5 priciest books for this store
    const topPriciestBooks = await this.getTopPriciestBooks(storeId);

    // Get top 5 prolific authors for this store
    const topProlificAuthors = await this.getTopProlificAuthors(storeId);

    // Generate PDF
    const pdfBuffer = await this.createPDF(
      store,
      topPriciestBooks,
      topProlificAuthors
    );

    // Generate filename
    const today = new Date().toISOString().split('T')[0];
    const filename = `${store.name.replace(
      /[^a-zA-Z0-9]/g,
      '-'
    )}-Report-${today}.pdf`;

    return { buffer: pdfBuffer, filename };
  }

  /**
   * Get top 5 priciest books in store
   * @param {number} storeId - Store ID
   * @returns {Promise<Array>} - Array of top priced books
   */
  async getTopPriciestBooks(storeId) {
    const storeBooks = await StoreBook.findAll({
      where: {
        store_id: storeId,
        sold_out: false,
      },
      include: [
        {
          model: Book,
          as: 'book',
          include: [
            {
              model: Author,
              as: 'author',
            },
          ],
        },
      ],
      order: [['price', 'DESC']],
      limit: 5,
    });

    return storeBooks.map((sb) => ({
      name: sb.book.name,
      author: sb.book.author.name,
      pages: sb.book.pages,
      price: parseFloat(sb.price),
      copies: sb.copies,
    }));
  }

  /**
   * Get top 5 prolific authors (by number of available books in inventory)
   * @param {number} storeId - Store ID
   * @returns {Promise<Array>} - Array of top authors with book counts
   */
  async getTopProlificAuthors(storeId) {
    const results = await sequelize.query(
      `
      SELECT 
        a.id,
        a.name,
        COUNT(DISTINCT sb.book_id) as book_count,
        SUM(sb.copies) as total_copies
      FROM authors a
      INNER JOIN books b ON b.author_id = a.id
      INNER JOIN store_books sb ON sb.book_id = b.id
      WHERE sb.store_id = :storeId AND sb.sold_out = false
      GROUP BY a.id, a.name
      ORDER BY book_count DESC, total_copies DESC
      LIMIT 5
    `,
      {
        replacements: { storeId },
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return results.map((r) => ({
      name: r.name,
      bookCount: parseInt(r.book_count, 10),
      totalCopies: parseInt(r.total_copies, 10),
    }));
  }

  /**
   * Create PDF document
   * @param {Object} store - Store object
   * @param {Array} topBooks - Top priced books
   * @param {Array} topAuthors - Top prolific authors
   * @returns {Promise<Buffer>} - PDF buffer
   */
  createPDF(store, topBooks, topAuthors) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header with logo and store name
      this.addHeader(doc, store);

      // Report date
      doc.moveDown();
      doc.fontSize(10).fillColor('#666666');
      doc.text(
        `Report Generated: ${new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`,
        { align: 'right' }
      );

      doc.moveDown(2);

      // Top 5 Priciest Books Section
      this.addPriciestBooksSection(doc, topBooks);

      doc.moveDown(2);

      // Top 5 Prolific Authors Section
      this.addProlificAuthorsSection(doc, topAuthors);

      // Footer
      this.addFooter(doc);

      doc.end();
    });
  }

  /**
   * Add header with logo and store name
   */
  addHeader(doc, store) {
    const pageWidth = doc.page.width - 100;

    // Try to add logo if available
    if (store.logo) {
      try {
        // Check if logo is a URL or base64
        if (store.logo.startsWith('http')) {
          // For URLs, we'd need to fetch the image first
          // For simplicity, we'll skip URL logos in this implementation
          doc
            .fontSize(24)
            .fillColor('#2c3e50')
            .text(store.name, { align: 'center' });
        } else if (store.logo.startsWith('data:image')) {
          // Base64 image
          const base64Data = store.logo.split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imageBuffer, doc.page.width / 2 - 40, 50, {
            width: 80,
            height: 80,
          });
          doc.moveDown(5);
          doc
            .fontSize(24)
            .fillColor('#2c3e50')
            .text(store.name, { align: 'center' });
        } else {
          doc
            .fontSize(24)
            .fillColor('#2c3e50')
            .text(store.name, { align: 'center' });
        }
      } catch (error) {
        // If logo fails, just show the name
        doc
          .fontSize(24)
          .fillColor('#2c3e50')
          .text(store.name, { align: 'center' });
      }
    } else {
      doc
        .fontSize(24)
        .fillColor('#2c3e50')
        .text(store.name, { align: 'center' });
    }

    // Underline
    doc.moveDown(0.5);
    doc.strokeColor('#3498db').lineWidth(2);
    doc
      .moveTo(50, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();
  }

  /**
   * Add Top 5 Priciest Books section
   */
  addPriciestBooksSection(doc, topBooks) {
    // Section title
    doc
      .fontSize(16)
      .fillColor('#2980b9')
      .text('📚 Top 5 Priciest Books', { underline: true });
    doc.moveDown();

    if (topBooks.length === 0) {
      doc
        .fontSize(12)
        .fillColor('#7f8c8d')
        .text('No books available in inventory.');
      return;
    }

    // Table header
    const startX = 50;
    const colWidths = [30, 150, 120, 60, 70, 60];
    let y = doc.y;

    doc.fontSize(10).fillColor('#2c3e50');
    doc.text('#', startX, y, { width: colWidths[0] });
    doc.text('Book Name', startX + colWidths[0], y, { width: colWidths[1] });
    doc.text('Author', startX + colWidths[0] + colWidths[1], y, {
      width: colWidths[2],
    });
    doc.text('Pages', startX + colWidths[0] + colWidths[1] + colWidths[2], y, {
      width: colWidths[3],
    });
    doc.text(
      'Price',
      startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
      y,
      { width: colWidths[4] }
    );
    doc.text(
      'Copies',
      startX +
        colWidths[0] +
        colWidths[1] +
        colWidths[2] +
        colWidths[3] +
        colWidths[4],
      y,
      { width: colWidths[5] }
    );

    doc.moveDown(0.5);
    doc.strokeColor('#bdc3c7').lineWidth(0.5);
    doc
      .moveTo(startX, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();
    doc.moveDown(0.5);

    // Table rows
    topBooks.forEach((book, index) => {
      y = doc.y;
      doc.fontSize(9).fillColor('#34495e');
      doc.text(`${index + 1}`, startX, y, { width: colWidths[0] });
      doc.text(this.truncateText(book.name, 25), startX + colWidths[0], y, {
        width: colWidths[1],
      });
      doc.text(
        this.truncateText(book.author, 20),
        startX + colWidths[0] + colWidths[1],
        y,
        { width: colWidths[2] }
      );
      doc.text(
        book.pages ? book.pages.toString() : 'N/A',
        startX + colWidths[0] + colWidths[1] + colWidths[2],
        y,
        { width: colWidths[3] }
      );
      doc.text(
        `$${book.price.toFixed(2)}`,
        startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3],
        y,
        { width: colWidths[4] }
      );
      doc.text(
        book.copies.toString(),
        startX +
          colWidths[0] +
          colWidths[1] +
          colWidths[2] +
          colWidths[3] +
          colWidths[4],
        y,
        { width: colWidths[5] }
      );
      doc.moveDown();
    });
  }

  /**
   * Add Top 5 Prolific Authors section
   */
  addProlificAuthorsSection(doc, topAuthors) {
    // Section title
    doc
      .fontSize(16)
      .fillColor('#27ae60')
      .text('✍️ Top 5 Prolific Authors', { underline: true });
    doc.moveDown();

    if (topAuthors.length === 0) {
      doc
        .fontSize(12)
        .fillColor('#7f8c8d')
        .text('No authors available in inventory.');
      return;
    }

    // Table header
    const startX = 50;
    const colWidths = [30, 200, 130, 130];
    let y = doc.y;

    doc.fontSize(10).fillColor('#2c3e50');
    doc.text('#', startX, y, { width: colWidths[0] });
    doc.text('Author Name', startX + colWidths[0], y, { width: colWidths[1] });
    doc.text('Books Available', startX + colWidths[0] + colWidths[1], y, {
      width: colWidths[2],
    });
    doc.text(
      'Total Copies',
      startX + colWidths[0] + colWidths[1] + colWidths[2],
      y,
      { width: colWidths[3] }
    );

    doc.moveDown(0.5);
    doc.strokeColor('#bdc3c7').lineWidth(0.5);
    doc
      .moveTo(startX, doc.y)
      .lineTo(doc.page.width - 50, doc.y)
      .stroke();
    doc.moveDown(0.5);

    // Table rows
    topAuthors.forEach((author, index) => {
      y = doc.y;
      doc.fontSize(9).fillColor('#34495e');
      doc.text(`${index + 1}`, startX, y, { width: colWidths[0] });
      doc.text(this.truncateText(author.name, 35), startX + colWidths[0], y, {
        width: colWidths[1],
      });
      doc.text(
        author.bookCount.toString(),
        startX + colWidths[0] + colWidths[1],
        y,
        { width: colWidths[2] }
      );
      doc.text(
        author.totalCopies.toString(),
        startX + colWidths[0] + colWidths[1] + colWidths[2],
        y,
        { width: colWidths[3] }
      );
      doc.moveDown();
    });
  }

  /**
   * Add footer to PDF
   */
  addFooter(doc) {
    const bottomMargin = 50;
    doc.fontSize(8).fillColor('#95a5a6');
    doc.text(
      'Generated by Digital Bookstore Inventory System',
      50,
      doc.page.height - bottomMargin,
      { align: 'center' }
    );
  }

  /**
   * Truncate text to fit in column
   */
  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength
      ? text.substring(0, maxLength - 3) + '...'
      : text;
  }
}

module.exports = new ReportService();
