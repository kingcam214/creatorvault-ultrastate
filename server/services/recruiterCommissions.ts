/**
 * Recruiter commission calculator
 * 70% creator, 25% platform, 2% recruiter, 3% regional ambassador, 5% Emma (Dominican only)
 */

export interface CommissionBreakdown {
  totalAmount: number; // in cents
  creatorAmount: number; // 70%
  platformAmount: number; // 25%
  recruiterAmount: number; // 2%
  ambassadorAmount: number; // 3%
  emmaAmount: number; // 5% (Dominican only)
}

export interface CommissionRecord {
  recruiterId: number;
  creatorId: number;
  transactionId: number;
  commissionAmount: number;
  commissionRate: number;
  paidOut: boolean;
}

/**
 * Calculate commission breakdown
 */
export function calculateCommissions(totalAmount: number, isDominican: boolean = false): CommissionBreakdown {
  const creatorAmount = Math.floor(totalAmount * 0.7);
  const platformAmount = Math.floor(totalAmount * 0.25);
  const recruiterAmount = Math.floor(totalAmount * 0.02);
  const ambassadorAmount = Math.floor(totalAmount * 0.03);
  const emmaAmount = isDominican ? Math.floor(totalAmount * 0.05) : 0;

  return {
    totalAmount,
    creatorAmount,
    platformAmount,
    recruiterAmount,
    ambassadorAmount,
    emmaAmount,
  };
}

/**
 * Record recruiter commission
 */
export async function recordCommission(
  recruiterId: number,
  creatorId: number,
  transactionId: number,
  commissionAmount: number,
  commissionRate: number
): Promise<{ success: boolean; commissionId: number }> {
  // In production: insert into recruiter_commissions table
  return {
    success: true,
    commissionId: Math.floor(Math.random() * 10000),
  };
}

/**
 * Get unpaid commissions for recruiter
 */
export async function getUnpaidCommissions(recruiterId: number): Promise<CommissionRecord[]> {
  // In production: query recruiter_commissions WHERE recruiterId=recruiterId AND paidOut=false
  return [];
}

/**
 * Mark commissions as paid
 */
export async function markCommissionsPaid(commissionIds: number[]): Promise<{ success: boolean }> {
  // In production: UPDATE recruiter_commissions SET paidOut=true, paidAt=now WHERE id IN (commissionIds)
  return { success: true };
}

/**
 * Get total commissions earned by recruiter
 */
export async function getTotalCommissions(recruiterId: number): Promise<number> {
  // In production: SUM(commissionAmount) FROM recruiter_commissions WHERE recruiterId=recruiterId
  return 0;
}
