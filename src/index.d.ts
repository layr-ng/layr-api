type ITeam = {
  id: string;

  creator_id: string;

  title: string;
  description: string | null;

  updatedAt: Date;
  createdAt: Date;
};

type ITeamMember = {
  id: string;

  team_id: string;
  user_id: string; // null if invited via email before signup

  author_id: string | null;

  role: "viewer" | "editor" | "owner" | "admin";

  invitation_status: "invited" | "accepted" | "declined";

  membership_status: "active" | "blocked" | "inactive" | "left";

  date_invited: Date | null;
  date_joined: Date | null;

  date_added: Date;
};

type ITeamDiagram = {
  id: string;

  team_id: string;
  diagram_id: string;

  author_id: string;

  date_added: Date;
};

/** Start Entity and Database model types */
type IDiagram = {
  id: string;
  title: string;
  description?: string;
  group_id?: string;
  sequence: string;
  tags?: string[];
  creator_id: string;
  visibility?: DiagramVisibility;
  metadata: any;
  thumbnail_url: string | null;
  thumbnail_updatedAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
};
type IDiagramPrompt = {
  id: string;
  diagram_id: string;

  user_id: string;

  prompt?: string;
  model_response?: string;

  new_sequence?: string;

  summary?: {
    text: string;
  };

  updatedAt: Date;
  createdAt: Date;
};
type ISequenceHistory = {
  id: string;
  diagram_id: string;

  user_id: string;

  prompt?: string;
  model_response?: string;

  former_sequence?: string;
  new_sequence?: string;

  summary?: {
    text: string;
  };

  updatedAt: Date;
  createdAt: Date;
};

type AuthEntity = "admin" | "user";

type DiagramVisibility = "hidden" | "public";
type IGroup = {
  id: string;
  title: string;
  description?: string;
  creator_id: string;
  createdAt: Date;
  updatedAt: Date;
};

type IAdmin = {
  id: string;
  full_name: string | null;
  email: string;
  picture: string | null;
  password: string;
  auth_strategy: "local";
  createdAt: Date;
  updatedAt: Date;
};
type IUser = {
  id: string;
  full_name: string | null;
  picture: string | null;
  google_id: string | null;
  password: string | null;
  auth_strategy: "local" | "google";
  email: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
};
type UserInJoinedTable = Pick<IUser, "id" | "full_name" | "picture">;

type ParticipantRoles = "viewer" | "editor" | "admin";

type IDiagramParticipant = {
  id: string;
  user_id: string;
  diagram_id: string;
  role: ParticipantRoles;
  is_creator?: boolean;
  updatedAt: Date;
  createdAt: Date;
};
type NotificationStatus = "unread" | "read" | "archived";
interface INotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  metadata?: {
    [key: string]: any;
  };
  readAt?: Date;
  status: NotificationStatus;
  createdAt: Date;
  updatedAt: Date;
}
type SubscriptionBillingCycle = "weekly" | "monthly";

type SubscriptionPlans = "pro" | "team";

type ISubscription = {
  id: string;

  billing_cycle: SubscriptionBillingCycle;
  plan: SubscriptionPlans;

  start_date?: Date;
  end_date: Date;

  amount: number;

  billing_currency: "usd";

  is_discount_applied: boolean;
  discount_type?: "percentage" | "fixed";
  discount_value: number;
  final_amount: number;

  discount_id?: string;
  user_id: string;

  payment_gateway: "flutterwave";
  payment_status: FlutterwaveTransaction["data"]["status"];
  payment_transaction_ref: string;

  // trial support
  is_trial: boolean;
  trial_end_date?: Date;

  createdAt: Date;
  updatedAt: Date;
};

type ISubscriptionDiscount = {
  id: string;

  code: string;

  expiration_date: Date | null; // null if no expiration

  discount_percentage: number; // e.g. 10 for 10% off
  max_redemptions?: number; // optional limit on number of uses
  times_redeemed?: number; // how many times it's been used

  createdAt: Date;
  updatedAt: Date;
};
/** End Entity and Database model types */
// Represents a Flutterwave transaction object
type FlutterwaveTransaction = {
  status: string;
  message: string;
  data: {
    id: number;
    tx_ref: string;
    flw_ref: string;
    device_fingerprint: string;
    amount: number;
    currency: string;
    charged_amount: number;
    app_fee: number;
    merchant_fee: number;
    processor_response: string;
    auth_model: string;
    ip: string;
    narration: string;
    status:
      | "successful"
      | "failed"
      | "pending"
      | "reversed"
      | "timeout"
      | "cancelled"
      | "queued"
      | "incomplete";
    payment_type: string;
    created_at: string;
    account_id: number;
    card: {
      first_6digits: string;
      last_4digits: string;
      issuer: string;
      country: string;
      type: string;
      token: string;
      expiry: string;
    };
    meta: Record<string, any> | null;
    amount_settled: number;
    customer: {
      id: number;
      name: string;
      phone_number: string;
      email: string;
      created_at: string;
    };
  };
};
type IApiResponse<T> = {
  status: "ok" | "error";
  data?: T;
  message?: string;
  error_code?: ErrorCodes;
};
type IPagination = {
  page: number;
  page_size: number;
  offset?: number;
};

type AuthProviderType = "email" | "google" | "github" | "apple";

type AuthIdentity = {
  id: string;
  user: string;
  provider: AuthProviderType;
  provider_id: "email" | string;
  email: string;
  password_hash?: string; // only for email
  is_verified: boolean;
  createdAt: Date;
  updatedAt: Date;
};
type AccountStatus = "active" | "inactive" | "blocked" | "flagged";
// src/types/google.oauth.ts
type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  id_token?: string;
  scope?: string;
};

type GoogleUserInfo = {
  sub: string; // Google's unique ID for the user
  name: string;
  given_name: string;
  family_name: string;
  picture?: string;
  email: string;
  email_verified: boolean;
  locale?: string;
  hd?: string; // Google Workspace domain if available
};

interface AuthRequest extends express.Request {
  user?: GoogleUserInfo;
}

type GoogleAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};
type ErrorCodes =
  | "VALIDATION_ERROR"
  | "RESOURCE_NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INTERNAL_SERVER_ERROR"
  | "SUBSCRIPTION_NOT_FOUND"
  | "CONFLICT"
  | "SOLO_PLAN_LIMIT_EXCEEDED"
  | "NEW_DEVICE_DETECTED";
