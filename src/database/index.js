import { Sequelize, DataTypes } from 'sequelize';

const sequelize = new Sequelize('postgres://postgres:admin@localhost:5432/postgres', {
  logging: false,
});

export { sequelize };