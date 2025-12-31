const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Store = sequelize.define(
    'Store',
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
            msg: 'Store name cannot be empty',
          },
        },
      },
      address: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      logo: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL or base64 encoded logo image',
      },
    },
    {
      tableName: 'stores',
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

  return Store;
};
