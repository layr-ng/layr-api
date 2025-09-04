import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../sequelize";
import User from "../user/user.model";

class Team extends Model<Optional<ITeam, "id" | "updatedAt" | "createdAt">> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

Team.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    creator_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "team",
    tableName: "teams",
    scopes: {},
    defaultScope: {
      attributes: {
        exclude: ["creator_id"],
      },
    },
  }
);

User.hasMany(Team, { foreignKey: "creator_id", as: "team_creator" });
Team.belongsTo(User, { foreignKey: "creator_id", as: "team_creator" });

export default Team;
