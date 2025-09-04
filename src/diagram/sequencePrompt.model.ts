import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../sequelize";

class DiagramPrompt extends Model<
  Optional<IDiagramPrompt, "id" | "updatedAt" | "createdAt">
> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

DiagramPrompt.init(
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
    new_sequence: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    prompt: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    model_response: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    summary: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "diagramPrompt",
    tableName: "diagramPrompts",
    scopes: {},
  }
);

export default DiagramPrompt;
