import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../sequelize";
import Diagram from "../diagram/diagram.model";
import Team from "./team.model";
import User from "../user/user.model";

class TeamDiagram extends Model<Optional<ITeamDiagram, "id">> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

TeamDiagram.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },

    team_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    diagram_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    author_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    date_added: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "teamDiagram",
    tableName: "teamDiagrams",
    timestamps: false,
    scopes: {},
  }
);

Diagram.hasMany(TeamDiagram, {
  foreignKey: "diagram_id",
  as: "team_diagram",
});
TeamDiagram.belongsTo(Diagram, {
  foreignKey: "diagram_id",
  as: "team_diagram",
});

Team.hasMany(TeamDiagram, { foreignKey: "team_id", as: "team_diagrams" });
TeamDiagram.belongsTo(Team, { foreignKey: "team_id", as: "team_diagrams" });

User.hasMany(TeamDiagram, {
  foreignKey: "author_id",
  as: "team_diagram_author",
});
TeamDiagram.belongsTo(User, {
  foreignKey: "author_id",
  as: "team_diagram_author",
});

export default TeamDiagram;
