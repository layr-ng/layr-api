import { Model, DataTypes, Optional, Op } from "sequelize";
import { sequelize } from "../sequelize";
import User from "../user/user.model";

class DiagramParticipant extends Model<
  Optional<IDiagramParticipant, "id" | "updatedAt" | "createdAt">
> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

DiagramParticipant.init(
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
    diagram_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("editor", "viewer", "admin"),
      allowNull: false,
    },
    is_creator: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "diagramParticipant",
    tableName: "diagramParticipants",
    defaultScope: {
      attributes: { exclude: ["id", "createdAt", "updatedAt"] },
    },
  }
);

User.hasMany(DiagramParticipant, { foreignKey: "user_id", as: "info" });
DiagramParticipant.belongsTo(User, { foreignKey: "user_id", as: "info" });

export default DiagramParticipant;
