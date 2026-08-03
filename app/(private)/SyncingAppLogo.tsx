"use client";

import Image from "next/image";

import { useSyncActivity } from "./SyncActivityProvider";

export function SyncingAppLogo() {
  const { isSyncing } = useSyncActivity();

  return (
    <div aria-busy={isSyncing} aria-label="Money Juggle">
      <Image
        className={isSyncing ? "app-logo-syncing" : undefined}
        src="/assets/brand/money-juggle-logo.png"
        alt="Money Juggle"
        width={40}
        height={41}
        priority
      />
    </div>
  );
}
