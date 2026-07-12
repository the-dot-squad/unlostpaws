/**
 * Footer social icon row — external profile links only.
 * GitHub is rendered separately in the Project column (text link + star count).
 */

import { Globe } from "lucide-react";
import { SOCIAL_ICON_PLATFORMS_EXCLUDE } from "@/lib/socials";

/** Common SVG wrapper component for stroke-based social icons to avoid duplication. */
const SocialSvg = ({ children, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

/** Custom GitHub icon matching Lucide stroke style (not exported by lucide-react here). */
export function GithubIcon(props) {
  return (
    <SocialSvg {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </SocialSvg>
  );
}

const XIcon = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = (props) => (
  <SocialSvg {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </SocialSvg>
);

const InstagramIcon = (props) => (
  <SocialSvg {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </SocialSvg>
);

const YoutubeIcon = (props) => (
  <SocialSvg {...props}>
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
    <path d="m10 15 5-3-5-3z" />
  </SocialSvg>
);

const LinkedinIcon = (props) => (
  <SocialSvg {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </SocialSvg>
);

const TelegramIcon = (props) => (
  <SocialSvg {...props}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </SocialSvg>
);

const WhatsappIcon = (props) => (
  <SocialSvg {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </SocialSvg>
);

const TiktokIcon = (props) => (
  <SocialSvg {...props}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </SocialSvg>
);

function getSocialIcon(platform) {
  const normalized = platform.trim().toLowerCase();
  switch (normalized) {
    case "github":
      return GithubIcon;
    case "x":
    case "twitter":
      return XIcon;
    case "facebook":
      return FacebookIcon;
    case "instagram":
      return InstagramIcon;
    case "youtube":
      return YoutubeIcon;
    case "linkedin":
      return LinkedinIcon;
    case "telegram":
      return TelegramIcon;
    case "whatsapp":
      return WhatsappIcon;
    case "tiktok":
      return TiktokIcon;
    default:
      return Globe;
  }
}

function formatPlatformLabel(platform) {
  if (platform === "x") return "X";
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

/**
 * @param {{ links: Array<{ platform: string, url: string }> }} props
 */
export function SocialLinks({ links }) {
  if (!links?.length) return null;

  const visibleLinks = links.filter((link) => {
    if (SOCIAL_ICON_PLATFORMS_EXCLUDE.has(link.platform.trim().toLowerCase())) return false;
    return link.url && link.url.trim().length > 0;
  });

  if (visibleLinks.length === 0) return null;

  return (
    <li>
      <div className="flex flex-wrap items-center gap-2.5">
        {visibleLinks.map(({ platform, url }) => {
          const Icon = getSocialIcon(platform);
          const label = formatPlatformLabel(platform);
          return (
            <a
              key={platform}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
              title={label}
              aria-label={`Visit us on ${label}`}
            >
              <Icon className="size-4 shrink-0 text-primary/70 transition-colors group-hover:text-primary" />
            </a>
          );
        })}
      </div>
    </li>
  );
}
