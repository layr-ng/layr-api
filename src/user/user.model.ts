import { Model, DataTypes, Optional, Op } from "sequelize";
import { sequelize } from "../sequelize";

class User extends Model<Optional<IUser, "id" | "updatedAt" | "createdAt">> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

User.init(
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
      type: DataTypes.ENUM("local", "google"),
      allowNull: false,
    },

    picture: DataTypes.STRING,
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    google_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "blocked"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    sequelize,
    modelName: "user",
    tableName: "users",
    scopes: {
      withPassword: {
        attributes: { include: ["password"] },
      },
      public: {
        attributes: { exclude: ["password", "email", "updatedAt", "status"] },
      },
    },
    defaultScope: {
      attributes: { exclude: ["password"] },
    },
  }
);

export default User;
