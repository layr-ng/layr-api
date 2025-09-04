import { Model, DataTypes, Optional, Op } from "sequelize";
import { sequelize } from "../sequelize";

class Admin extends Model<Optional<IAdmin, "id" | "updatedAt" | "createdAt">> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

Admin.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    auth_strategy: {
      type: DataTypes.ENUM("local"),
      allowNull: false,
    },

    picture: DataTypes.STRING,
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "admin",
    tableName: "admins",
    scopes: {
      withPassword: {
        attributes: { include: ["password"] },
      },
    },
    defaultScope: {
      attributes: { exclude: ["password"] },
    },
  }
);

export default Admin;
