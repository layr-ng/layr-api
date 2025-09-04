import { Model, DataTypes, Optional, Op } from "sequelize";
import { sequelize } from "../sequelize";

class Subscription extends Model<
  Optional<ISubscription, "id" | "updatedAt" | "createdAt">
> {
  toJSON() {
    const attributes = { ...this.get() };
    return attributes;
  }
}
Subscription.init(
  {
    id: {
      primaryKey: true,
      type: DataTypes.UUID,
      unique: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    billing_currency: {
      type: DataTypes.ENUM("usd"),
      allowNull: false,
    },
    billing_cycle: {
      type: DataTypes.ENUM("weekly", "monthly"),
      allowNull: false,
    },
    is_trial: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    trial_end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_discount_applied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    discount_type: {
      // 'percentage' or 'fixed'
      type: DataTypes.ENUM("percentage", "fixed"),
      allowNull: true,
    },
    discount_value: {
      // e.g. 20 (%) or 500 (fixed amount)
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    final_amount: {
      // amount after discount
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    plan: {
      type: DataTypes.ENUM("pro", "team"),
      allowNull: false,
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    discount_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    payment_gateway: {
      type: DataTypes.ENUM("flutterwave"),
      allowNull: false,
    },
    payment_transaction_ref: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "subscription",
    tableName: "subscriptions",
  }
);

export default Subscription;
