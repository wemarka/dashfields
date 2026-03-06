/**
 * builder-steps/constants.ts — Shared types and constants for CampaignBuilder.
 */
import {
  Eye, MousePointer, Heart, Users, ShoppingCart, Play, MessageSquare, Rocket,
} from "lucide-react";

export type Step = 1 | 2 | 3 | 4;

export const OBJECTIVES = [
  { id: "AWARENESS",    label: "Brand Awareness",  icon: Eye,          desc: "Maximize reach & brand recall" },
  { id: "TRAFFIC",      label: "Traffic",           icon: MousePointer, desc: "Drive clicks to your website" },
  { id: "ENGAGEMENT",   label: "Engagement",        icon: Heart,        desc: "Boost likes, comments & shares" },
  { id: "LEADS",        label: "Lead Generation",   icon: Users,        desc: "Collect leads & contact info" },
  { id: "CONVERSIONS",  label: "Conversions",       icon: ShoppingCart, desc: "Drive purchases & sign-ups" },
  { id: "VIDEO_VIEWS",  label: "Video Views",       icon: Play,         desc: "Maximize video watch time" },
  { id: "MESSAGES",     label: "Messages",          icon: MessageSquare,desc: "Start conversations on Messenger" },
  { id: "APP_INSTALLS", label: "App Installs",      icon: Rocket,       desc: "Drive app downloads" },
];

export const PLATFORMS_SUPPORTED = ["facebook", "instagram", "twitter", "linkedin", "tiktok", "youtube"];

export const AGE_RANGES = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
export const GENDERS    = ["All", "Male", "Female"];
export const INTERESTS  = [
  "Technology", "Fashion", "Sports", "Travel", "Food & Dining",
  "Health & Fitness", "Business", "Entertainment", "Education",
  "Finance", "Automotive", "Real Estate", "Gaming", "Beauty",
  "Parenting", "Music", "Art & Design", "Politics", "Science",
];
export const LOCATIONS = [
  "Saudi Arabia", "UAE", "Egypt", "Jordan", "Kuwait", "Qatar",
  "Bahrain", "Oman", "Lebanon", "Iraq", "Morocco", "Tunisia",
  "United States", "United Kingdom", "Germany", "France",
  "India", "Pakistan", "Turkey", "Indonesia",
];
export const CTAS = ["Learn More", "Shop Now", "Sign Up", "Contact Us", "Download", "Watch More", "Get Offer", "Book Now"];
