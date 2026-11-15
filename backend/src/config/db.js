const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
  }
);

const syncDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    require('../models/index');

    await sequelize.sync({ alter: true });
    console.log('✅ Models synced');
  } catch (err) {
    console.error('❌ DB error:', err.message);
    process.exit(1);
  }
};

module.exports = { sequelize, syncDB };