"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicEnv } from "@/config/public";

// Custom Github Icon matching Lucide style since Lucide-react doesn't export it in this project
function GithubIcon(props) {
  return (
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
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function GithubStarButton() {
  const [stars, setStars] = useState(null);

  useEffect(() => {
    const repoUrl = publicEnv.githubRepo;
    if (!repoUrl) return;

    try {
      const urlObj = new URL(repoUrl);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        const owner = pathParts[0];
        const repo = pathParts[1].replace(/\.git$/, "");
        
        fetch(`https://api.github.com/repos/${owner}/${repo}`)
          .then((res) => {
            if (res.ok) return res.json();
            throw new Error("Failed to fetch GitHub repository data");
          })
          .then((data) => {
            if (typeof data.stargazers_count === "number") {
              setStars(data.stargazers_count);
            }
          })
          .catch((err) => {
            console.error("Error fetching Github stars:", err);
          });
      }
    } catch (e) {
      console.error("Invalid GitHub repo URL:", e);
    }
  }, []);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
      asChild
    >
      <a
        href={publicEnv.githubRepo}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="GitHub Repository"
      >
        <GithubIcon className="size-4" />
        {stars !== null ? (
          <span className="flex items-center gap-1 text-xs font-semibold">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span>{stars}</span>
          </span>
        ) : (
          <span className="hidden sm:inline text-xs font-medium">Github</span>
        )}
      </a>
    </Button>
  );
}
