/**
 * 💃 DAYSHIFT DOCTOR - STRIP CLUB VERTICAL
 * 
 * Strip club partnerships and dancer monetization
 * 
 * Tagline: "Monetize Every Shift"
 * Voice: Empowering, hustle-focused, club-savvy
 * 
 * Dallas Clubs: Diamond Girls (DG), Baby Dolls, Onyx, Bucks
 */

export interface StripClub {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone?: string;
  website?: string;
  
  // Club details
  type: "upscale" | "mid_tier" | "dive";
  hasVipRooms: boolean;
  avgDancerCount: number;
  avgNightlyRevenue: number;
  
  // Partnership status
  partnershipStatus: "active" | "pending" | "inactive";
  partnershipStartDate?: Date;
  commissionRate: number; // Percentage club takes from platform
  
  // Contact
  managerName?: string;
  managerPhone?: string;
  managerEmail?: string;
}

export interface Dancer {
  id: string;
  userId: string; // Links to users table
  stageName: string;
  realName?: string; // Private
  
  // Club affiliations
  primaryClubId: string;
  secondaryClubIds?: string[];
  
  // Profile
  bio?: string;
  profileImageUrl?: string;
  instagramHandle?: string;
  twitterHandle?: string;
  
  // Stats
  avgShiftsPerWeek: number;
  avgRevenuePerShift: number;
  totalLifetimeRevenue: number;
  
  // Platform status
  isActive: boolean;
  joinedDate: Date;
  lastActiveDate: Date;
  
  // Payment info
  cashappHandle?: string;
  zelleHandle?: string;
  applepayHandle?: string;
  stripeAccountId?: string;
}

export interface Shift {
  id: string;
  dancerId: string;
  clubId: string;
  
  // Timing
  shiftDate: Date;
  startTime: string; // "20:00"
  endTime: string; // "02:00"
  duration: number; // Hours
  
  // Revenue
  totalRevenue: number;
  cashTips: number;
  creditCardTips: number;
  vipRoomRevenue: number;
  stageRevenue: number;
  
  // Splits
  dancerAmount: number;
  clubAmount: number;
  platformAmount: number;
  
  // Notes
  notes?: string;
  mood?: "great" | "good" | "ok" | "bad";
}

export interface VipRoom {
  id: string;
  clubId: string;
  roomNumber: string;
  
  // Session details
  dancerId: string;
  customerId?: string; // If tracked
  startTime: Date;
  endTime: Date;
  duration: number; // Minutes
  
  // Revenue
  roomFee: number;
  tipAmount: number;
  totalRevenue: number;
  
  // Splits
  dancerAmount: number;
  clubAmount: number;
  platformAmount: number;
}

export interface ClubAnalytics {
  clubId: string;
  period: "day" | "week" | "month" | "year";
  startDate: Date;
  endDate: Date;
  
  // Dancer metrics
  totalDancers: number;
  activeDancers: number;
  avgDancersPerShift: number;
  
  // Revenue metrics
  totalRevenue: number;
  avgRevenuePerDancer: number;
  avgRevenuePerShift: number;
  
  // VIP metrics
  totalVipSessions: number;
  avgVipDuration: number;
  vipRevenue: number;
  
  // Platform metrics
  platformRevenue: number;
  clubRevenue: number;
  dancerRevenue: number;
}

/**
 * Dallas club presets
 */
export const DALLAS_CLUBS: Omit<StripClub, "id">[] = [
  {
    name: "Diamond Girls",
    city: "Dallas",
    state: "TX",
    address: "10129 Shady Trail, Dallas, TX 75220",
    phone: "(214) 350-7000",
    type: "mid_tier",
    hasVipRooms: true,
    avgDancerCount: 30,
    avgNightlyRevenue: 15000,
    partnershipStatus: "pending",
    commissionRate: 10
  },
  {
    name: "Baby Dolls",
    city: "Dallas",
    state: "TX",
    address: "10250 Shady Trail, Dallas, TX 75220",
    phone: "(214) 350-5400",
    type: "upscale",
    hasVipRooms: true,
    avgDancerCount: 50,
    avgNightlyRevenue: 30000,
    partnershipStatus: "pending",
    commissionRate: 10
  },
  {
    name: "Onyx Cabaret",
    city: "Dallas",
    state: "TX",
    address: "10370 Shady Trail, Dallas, TX 75220",
    phone: "(214) 357-6969",
    type: "upscale",
    hasVipRooms: true,
    avgDancerCount: 40,
    avgNightlyRevenue: 25000,
    partnershipStatus: "pending",
    commissionRate: 10
  },
  {
    name: "Bucks Cabaret",
    city: "Fort Worth",
    state: "TX",
    address: "7301 Jacksboro Hwy, Fort Worth, TX 76135",
    phone: "(817) 237-2257",
    type: "upscale",
    hasVipRooms: true,
    avgDancerCount: 35,
    avgNightlyRevenue: 20000,
    partnershipStatus: "pending",
    commissionRate: 10
  }
];

/**
 * Calculate shift revenue split
 */
export function calculateShiftSplit(params: {
  totalRevenue: number;
  clubCommissionRate: number; // Percentage club takes
  platformCommissionRate?: number; // Percentage platform takes (default 5%)
}): {
  total: number;
  dancer: number;
  club: number;
  platform: number;
} {
  const { totalRevenue, clubCommissionRate, platformCommissionRate = 5 } = params;

  const clubAmount = totalRevenue * (clubCommissionRate / 100);
  const platformAmount = totalRevenue * (platformCommissionRate / 100);
  const dancerAmount = totalRevenue - clubAmount - platformAmount;

  return {
    total: totalRevenue,
    dancer: dancerAmount,
    club: clubAmount,
    platform: platformAmount
  };
}

/**
 * Calculate VIP room split
 */
export function calculateVipSplit(params: {
  roomFee: number;
  tipAmount: number;
  clubCommissionRate: number;
  platformCommissionRate?: number;
}): {
  total: number;
  dancer: number;
  club: number;
  platform: number;
} {
  const totalRevenue = params.roomFee + params.tipAmount;
  return calculateShiftSplit({
    totalRevenue,
    clubCommissionRate: params.clubCommissionRate,
    platformCommissionRate: params.platformCommissionRate
  });
}

/**
 * Project dancer monthly revenue
 */
export function projectDancerRevenue(params: {
  avgRevenuePerShift: number;
  shiftsPerWeek: number;
  clubCommissionRate: number;
  platformCommissionRate?: number;
}): {
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  weeklyDancerAmount: number;
  monthlyDancerAmount: number;
  yearlyDancerAmount: number;
} {
  const { avgRevenuePerShift, shiftsPerWeek, clubCommissionRate, platformCommissionRate = 5 } = params;

  const weeklyRevenue = avgRevenuePerShift * shiftsPerWeek;
  const monthlyRevenue = weeklyRevenue * 4.33;
  const yearlyRevenue = monthlyRevenue * 12;

  const split = calculateShiftSplit({
    totalRevenue: weeklyRevenue,
    clubCommissionRate,
    platformCommissionRate
  });

  const weeklyDancerAmount = split.dancer;
  const monthlyDancerAmount = weeklyDancerAmount * 4.33;
  const yearlyDancerAmount = monthlyDancerAmount * 12;

  return {
    weeklyRevenue,
    monthlyRevenue,
    yearlyRevenue,
    weeklyDancerAmount,
    monthlyDancerAmount,
    yearlyDancerAmount
  };
}

/**
 * Calculate club partnership revenue
 */
export function calculateClubRevenue(params: {
  avgDancerCount: number;
  avgRevenuePerDancer: number;
  shiftsPerWeek: number;
  clubCommissionRate: number;
  platformCommissionRate?: number;
}): {
  weeklyClubRevenue: number;
  monthlyClubRevenue: number;
  yearlyClubRevenue: number;
  weeklyPlatformRevenue: number;
  monthlyPlatformRevenue: number;
  yearlyPlatformRevenue: number;
} {
  const { avgDancerCount, avgRevenuePerDancer, shiftsPerWeek, clubCommissionRate, platformCommissionRate = 5 } = params;

  const weeklyTotalRevenue = avgDancerCount * avgRevenuePerDancer * shiftsPerWeek;
  const split = calculateShiftSplit({
    totalRevenue: weeklyTotalRevenue,
    clubCommissionRate,
    platformCommissionRate
  });

  const weeklyClubRevenue = split.club;
  const weeklyPlatformRevenue = split.platform;

  return {
    weeklyClubRevenue,
    monthlyClubRevenue: weeklyClubRevenue * 4.33,
    yearlyClubRevenue: weeklyClubRevenue * 52,
    weeklyPlatformRevenue,
    monthlyPlatformRevenue: weeklyPlatformRevenue * 4.33,
    yearlyPlatformRevenue: weeklyPlatformRevenue * 52
  };
}

/**
 * Optimize shift scheduling
 */
export function optimizeShiftSchedule(params: {
  dancerAvailability: string[]; // ["monday", "tuesday", "friday"]
  clubBusiestDays: string[]; // ["friday", "saturday"]
  targetShiftsPerWeek: number;
}): {
  recommendedDays: string[];
  reason: string;
} {
  const { dancerAvailability, clubBusiestDays, targetShiftsPerWeek } = params;

  // Prioritize busiest days that dancer is available
  const optimalDays = dancerAvailability.filter(day => clubBusiestDays.includes(day));
  
  // Fill remaining shifts with other available days
  const remainingDays = dancerAvailability.filter(day => !optimalDays.includes(day));
  const recommendedDays = [
    ...optimalDays,
    ...remainingDays.slice(0, targetShiftsPerWeek - optimalDays.length)
  ];

  const reason = optimalDays.length > 0
    ? `Prioritized ${optimalDays.length} high-revenue days (${optimalDays.join(", ")})`
    : "No overlap with club's busiest days - consider adjusting availability";

  return {
    recommendedDays,
    reason
  };
}

/**
 * Calculate break-even point for dancers
 */
export function calculateDancerBreakEven(params: {
  monthlyExpenses: number;
  avgRevenuePerShift: number;
  clubCommissionRate: number;
  platformCommissionRate?: number;
}): {
  shiftsNeededPerMonth: number;
  shiftsNeededPerWeek: number;
  monthlyRevenueNeeded: number;
} {
  const { monthlyExpenses, avgRevenuePerShift, clubCommissionRate, platformCommissionRate = 5 } = params;

  const split = calculateShiftSplit({
    totalRevenue: avgRevenuePerShift,
    clubCommissionRate,
    platformCommissionRate
  });

  const dancerAmountPerShift = split.dancer;
  const shiftsNeededPerMonth = Math.ceil(monthlyExpenses / dancerAmountPerShift);
  const shiftsNeededPerWeek = Math.ceil(shiftsNeededPerMonth / 4.33);
  const monthlyRevenueNeeded = shiftsNeededPerMonth * avgRevenuePerShift;

  return {
    shiftsNeededPerMonth,
    shiftsNeededPerWeek,
    monthlyRevenueNeeded
  };
}
