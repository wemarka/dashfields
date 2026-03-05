// server/db.ts
// Barrel file — re-exports all database helpers from server/db/
// Kept for backward compatibility with server/_core imports.

// Connection
export { getDb } from "./app/db/index";

// User helpers
export {
  getUserByOpenId,
  getUserById,
  upsertUser,
} from "./app/db/users";

// Campaign helpers
export {
  getUserCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaignStatus,
  getCampaignMetrics,
} from "./app/db/campaigns";

// Post helpers
export {
  getUserPosts,
  createPost,
  updatePostStatus,
} from "./app/db/posts";

// Social account helpers
export {
  getUserSocialAccounts,
  upsertSocialAccount,
  deleteSocialAccount,
} from "./app/db/social";

// Settings, notifications, alerts
export {
  getUserSettings,
  upsertUserSettings,
  getUserNotifications,
  markNotificationRead,
  createNotification,
  getUserAlertRules,
  createAlertRule,
  deleteAlertRule,
} from "./app/db/settings";
