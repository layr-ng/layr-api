import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../sequelize";
import User from "../user/user.model";
import DiagramParticipant from "./participant.model";
import { constructImageSubPath } from "../helpers";

class Diagram extends Model<
  Optional<IDiagram, "id" | "updatedAt" | "createdAt">
> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }

  async getUserDetails(id: string) {
    return await User.scope("public").findByPk(id);
  }
}

Diagram.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    description: DataTypes.STRING,
    sequence: DataTypes.JSON,
    tags: DataTypes.ARRAY(DataTypes.STRING),
    title: { type: DataTypes.STRING, allowNull: false },

    visibility: DataTypes.ENUM("public", "hidden"),

    thumbnail_url: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const rawValue = this.getDataValue("thumbnail_url");
        return constructImageSubPath("diagrams", rawValue);
      },
    },
    thumbnail_updatedAt: DataTypes.DATE,

    group_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    creator_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    metadata: DataTypes.JSON,
  },
  {
    sequelize,
    modelName: "diagram",
    tableName: "diagrams",
    scopes: {
      publiclyShared: {
        attributes: {
          exclude: ["creator_id", "group_id", "upstream", "upstream_count", ""],
        },
      },
    },
  }
);

User.hasMany(Diagram, { foreignKey: "creator_id", as: "creator" });
Diagram.belongsTo(User, { foreignKey: "creator_id", as: "creator" });

Diagram.hasMany(DiagramParticipant, {
  foreignKey: "diagram_id",
  as: "participants",
});
DiagramParticipant.belongsTo(Diagram, {
  foreignKey: "diagram_id",
  as: "diagram",
});

export default Diagram;
