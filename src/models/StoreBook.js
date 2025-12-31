const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StoreBook = sequelize.define(
    'StoreBook',
    {
      store_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'stores',
          key: 'id',
        },
      },
      book_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'books',
          key: 'id',
        },
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Price cannot be negative',
          },
        },
      },
      copies: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [0],
            msg: 'Copies cannot be negative',
          },
        },
      },
      sold_out: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'store_books',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return StoreBook;
};
