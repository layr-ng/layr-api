import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../sequelize";
import User from "../user/user.model";

class Notification extends Model<
  Optional<INotification, "id" | "updatedAt" | "createdAt">
> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

Notification.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },

    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM("unread", "read", "archived"),
      defaultValue: "unread",
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "notification",
    tableName: "notifications",
  }
);

User.hasMany(Notification, { foreignKey: "user_id", as: "user" });
Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });

export default Notification;
