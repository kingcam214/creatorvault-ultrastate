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
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  
  const result: any = await db.execute(sql`
    INSERT INTO recruiter_commissions (recruiter_id, creator_id, transaction_id, commission_amount, commission_rate)
    VALUES (${recruiterId}, ${creatorId}, ${transactionId}, ${commissionAmount}, ${commissionRate})
  `);
  
  return {
    success: true,
    commissionId: Number(result.insertId || 0),
  };
}

/**
 * Get unpaid commissions for recruiter
 */
export async function getUnpaidCommissions(recruiterId: number): Promise<CommissionRecord[]> {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  
  const result: any = await db.execute(sql`
    SELECT * FROM recruiter_commissions 
    WHERE recruiter_id = ${recruiterId} AND paid_out = FALSE
    ORDER BY created_at DESC
  `);
  
  return ((result.rows || []) as any[]).map(row => ({
    recruiterId: row.recruiter_id,
    creatorId: row.creator_id,
    transactionId: row.transaction_id,
    commissionAmount: row.commission_amount,
    commissionRate: Number(row.commission_rate),
    paidOut: Boolean(row.paid_out),
  }));
}

/**
 * Mark commissions as paid
 */
export async function markCommissionsPaid(commissionIds: number[]): Promise<{ success: boolean }> {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  
  if (commissionIds.length === 0) return { success: true };
  
  const idList = commissionIds.join(',');
  await db.execute(sql.raw(`
    UPDATE recruiter_commissions 
    SET paid_out = TRUE, paid_at = NOW() 
    WHERE id IN (${idList})
  `));
  
  return { success: true };
}

/**
 * Get total commissions earned by recruiter
 */
export async function getTotalCommissions(recruiterId: number): Promise<number> {
  const { db } = await import("../db");
  const { sql } = await import("drizzle-orm");
  
  const result: any = await db.execute(sql`
    SELECT COALESCE(SUM(commission_amount), 0) as total 
    FROM recruiter_commissions 
    WHERE recruiter_id = ${recruiterId}
  `);
  
  return Number((result.rows?.[0] as any)?.total || 0);
}
