'use client';

import { createContext, FC, ReactNode, useContext } from 'react';
import {
  pricing,
  PricingInnerInterface,
} from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';

export type AppUserRole = 'USER' | 'ADMIN' | 'SUPERADMIN';
export type AppUserTier = 'FREE' | 'STANDARD' | 'PRO' | 'ULTIMATE' | 'TEAM';

export type RawAppUser = {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  timezone?: string;
  language?: string;
  bio?: string;
  audience?: number;
  isSuperAdmin: boolean;
  admin: boolean;
  orgId: string;
  tier: AppUserTier;
  publicApi: string;
  role: AppUserRole;
  totalChannels: number;
  isLifetime?: boolean;
  impersonate: boolean;
  allowTrial: boolean;
  isTrailing: boolean;
  streakSince: string | null;
};

export type AppUser = Omit<RawAppUser, 'tier'> & {
  tier: PricingInnerInterface;
};

export const UserContext = createContext<AppUser | undefined>(undefined);
export const ContextWrapper: FC<{
  user?: RawAppUser;
  children: ReactNode;
}> = ({ user, children }) => {
  const values = user
    ? {
        ...user,
        tier: pricing[user.tier],
      }
    : undefined;
  return <UserContext.Provider value={values}>{children}</UserContext.Provider>;
};
export const useUser = () => useContext(UserContext);
