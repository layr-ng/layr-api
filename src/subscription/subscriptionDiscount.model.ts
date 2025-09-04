import { Model, DataTypes, Optional, Op } from "sequelize";
import { sequelize } from "../sequelize";

class SubscriptionDiscount extends Model<
  Optional<ISubscriptionDiscount, "id" | "updatedAt" | "createdAt">
> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}
SubscriptionDiscount.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiration_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    max_redemptions: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    times_redeemed: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    discount_percentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "subscriptionDiscount",
    tableName: "subscriptionDiscounts",
  }
);

export default SubscriptionDiscount;
