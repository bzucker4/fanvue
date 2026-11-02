"use client";

import { BottomNavigation, BottomNavigationAction, FolderIcon, ImageIcon, LinkIcon, SettingsIcon } from "@fanvue/ui";
import NextLink from "next/link";

const LINKS = [
  { href: "/workspace/connection", value: "/workspace/connection", label: "Connection", icon: LinkIcon },
  { href: "/workspace/library", value: "/workspace/library", label: "Library", icon: ImageIcon },
  { href: "/workspace/bundles", value: "/workspace/bundles", label: "Bundles", icon: FolderIcon },
  { href: "/workspace/settings", value: "/workspace/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function WorkspaceMobileNav({ current }: { current: string }) {
  return (
    <BottomNavigation value={current} hideOnDesktop hasInformationArchitectureNav aria-label="Workspace">
      {LINKS.map((link) => {
        const Icon = link.icon;
        const selected = current === link.value;
        return (
          <BottomNavigationAction key={link.href} value={link.value} label={link.label} icon={<Icon size={24} filled={selected} />} asChild>
            <NextLink href={link.href} aria-label={link.label} />
          </BottomNavigationAction>
        );
      })}
    </BottomNavigation>
  );
}
