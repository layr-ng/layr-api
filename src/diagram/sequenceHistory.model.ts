import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../sequelize";

class SequenceHistory extends Model<
  Optional<ISequenceHistory, "id" | "updatedAt" | "createdAt">
> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

SequenceHistory.init(
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
    former_sequence: {
      type: DataTypes.JSON,
      allowNull: true,
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
      type: DataTypes.STRING,
      allowNull: true,
    },
    summary: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "sequenceHistory",
    tableName: "sequenceHistories",
    scopes: {},
  }
);

export default SequenceHistory;
