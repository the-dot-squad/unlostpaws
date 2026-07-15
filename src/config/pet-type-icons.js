import React from "react";
import {
  Dog,
  Cat,
  Bird,
  Rabbit,
  Rat,
  Fish,
  Turtle,
  Footprints,
  PawPrint,
} from "lucide-react";

/** Custom monkey face icon matching Lucide style guidelines. */
const Monkey = React.forwardRef(({ size = 24, className, ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="6" />
    <path d="M6 12a3 3 0 1 1 0-5" />
    <path d="M18 7a3 3 0 1 1 0 5" />
    <path d="M8.5 11c.5-.5 1.5-.75 2.5-.5" />
    <path d="M15.5 11c-.5-.5-1.5-.75-2.5-.5" />
    <circle cx="10" cy="11.5" r="0.75" fill="currentColor" />
    <circle cx="14" cy="11.5" r="0.75" fill="currentColor" />
    <path d="M9 14.5a3 3 0 0 0 6 0" />
    <path d="M11.5 13h1" />
  </svg>
));
Monkey.displayName = "Monkey";

/** Lucide icon for each pet type — shared across selects and filters. */
export const PET_TYPE_ICONS = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  hamster: Rat,
  fish: Fish,
  reptile: Turtle,
  horse: Footprints,
  monkey: Monkey,
  other: PawPrint,
};
