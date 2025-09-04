import { Model, DataTypes, Optional } from "sequelize";
import { sequelize } from "../sequelize";
import User from "../user/user.model";
import Team from "./team.model";

class TeamMember extends Model<Optional<ITeamMember, "id">> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}

TeamMember.init(
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false, // nullable for invited users without account
    },

    invitation_status: DataTypes.ENUM("invited", "accepted", "declined"),

    membership_status: DataTypes.ENUM("active", "blocked", "left", "inactive"),

    author_id: DataTypes.UUID,
    date_invited: DataTypes.DATE,
    date_joined: DataTypes.DATE,

    role: {
      type: DataTypes.ENUM("viewer", "editor", "owner", "admin"),
      allowNull: false,
    },
    date_added: DataTypes.DATE,
  },
  {
    sequelize,
    modelName: "teamMember",
    tableName: "teamMembers",
    scopes: {},
  }
);

User.hasMany(TeamMember, { foreignKey: "user_id", as: "team_member" });
TeamMember.belongsTo(User, { foreignKey: "user_id", as: "team_member" });

Team.hasMany(TeamMember, { foreignKey: "team_id", as: "team_members" });
TeamMember.belongsTo(Team, { foreignKey: "team_id", as: "team_members" });

export default TeamMember;
