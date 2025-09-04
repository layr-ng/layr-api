import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../sequelize";
import User from "../user/user.model";
import Diagram from "./diagram.model";

class Group extends Model<Optional<IGroup, "id" | "updatedAt" | "createdAt">> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }

  async getUserDetails(id: string) {
    return await User.scope("public").findByPk(id);
  }
}

Group.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    description: DataTypes.STRING,
    title: { type: DataTypes.STRING, allowNull: false },

    creator_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "group",
    tableName: "groups",
  }
);

User.hasMany(Group, { foreignKey: "creator_id", as: "group_creator" });
Group.belongsTo(User, { foreignKey: "creator_id", as: "group_creator" });

Group.hasMany(Diagram, {
  foreignKey: "group_id",
  as: "diagrams",
});
Diagram.belongsTo(Group, {
  foreignKey: "group_id",
  as: "group",
});

export default Group;
