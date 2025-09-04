import { Sequelize } from "sequelize";
import { NODE_ENV, PG_CONFIG } from "./config";

const sequelize = new Sequelize(
  PG_CONFIG.database!,
  PG_CONFIG.username!,
  PG_CONFIG.password!,
  {
    host: PG_CONFIG.host,
    port: PG_CONFIG.port,
    dialect: "postgres",
    logging: NODE_ENV === "development" ? console.log : false,
    define: {
      timestamps: true,
      freezeTableName: true,
    },
    pool: {
      max: 100,
      min: 5,
      acquire: 30000,
      idle: 10000,
    },
    retry: {
      max: 3,
    },
    dialectOptions: {
      // ssl: {
      //   require: true,
      //   rejectUnauthorized: false, // set true if you have proper CA certs
      // },
    },
  }
);
(async function () {
  try {
    await sequelize.authenticate();
    // sequelize.sync({ force: true });
  } catch (err) {
    throw new Error("Database connection failed:" + err);
  }
})();

export { sequelize };
