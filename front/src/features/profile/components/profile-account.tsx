"use client";

import { useSession } from "@/features/auth/session/session-provider";
import { mockPasswordUpdated } from "@/features/profile/mock/profile";
import { AccountDetailsCard } from "./account-details-card";
import { PasswordCard } from "./password-card";

export function ProfileAccount() {
  const { user } = useSession();

  if (!user) {
    return null;
  }

  return (
    <>
      <AccountDetailsCard name={user.name} email={user.email} />
      <PasswordCard email={user.email} passwordUpdated={mockPasswordUpdated} />
    </>
  );
}
