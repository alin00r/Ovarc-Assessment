const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Book = sequelize.define(
    'Book',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Book name cannot be empty',
          },
        },
      },
      pages: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: {
            args: [1],
            msg: 'Pages must be at least 1',
          },
        },
      },
      author_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'authors',
          key: 'id',
        },
      },
    },
    {
      tableName: 'books',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['name', 'author_id'],
        },
      ],
    }
  );

  return Book;
};
