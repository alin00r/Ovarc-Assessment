const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Author = sequelize.define(
    'Author',
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
            msg: 'Author name cannot be empty',
          },
        },
      },
    },
    {
      tableName: 'authors',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          unique: true,
          fields: ['name'],
        },
      ],
    }
  );

  return Author;
};
