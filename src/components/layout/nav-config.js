import {
  LayoutDashboard,
  FileText,
  Heart,
  GitCompare,
  Settings,
} from "lucide-react";

export const MAIN_NAV_LINKS = [
  { href: "/listings", labelKey: "nav.listings" },
  { href: "/map", labelKey: "nav.map" },
  { href: "/about", labelKey: "nav.about" },
];

export const CREATE_LISTING_LINK = {
  href: "/listings/new",
  labelKey: "nav.createListing",
};

export const ACCOUNT_NAV_LINKS = [
  { href: "/account", labelKey: "nav.account", icon: LayoutDashboard },
  { href: "/account/listings", labelKey: "nav.myListings", icon: FileText },
  { href: "/account/pets", labelKey: "nav.myPets", icon: Heart },
  { href: "/account/matches", labelKey: "nav.matches", icon: GitCompare },
  { href: "/account/settings", labelKey: "account.nav.profile", icon: Settings },
];
