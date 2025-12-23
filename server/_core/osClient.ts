/**
 * 🦁 CREATORVAULT OS CLIENT
 * 
 * Read-only client for CreatorVault app to query OS authority system.
 * App may READ: sector definitions, feature status, rules.
 * App may NOT override OS authority.
 */

const OS_BASE_URL = process.env.OS_BASE_URL || "http://localhost:4000/api";

interface OSResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Generic OS API fetch
 */
async function fetchOS<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${OS_BASE_URL}${endpoint}`);
  const json: OSResponse<T> = await response.json();
  
  if (!json.success || !json.data) {
    throw new Error(json.error || "OS API request failed");
  }
  
  return json.data;
}

// ============================================================================
// TRUTH REGISTRY
// ============================================================================

export interface TruthEntry {
  id: number;
  name: string;
  description: string;
  source: string;
  status: "planned" | "built" | "live" | "broken" | "missing";
  proofRequired: boolean;
  proofArtifact?: string;
  category?: string;
  priority: number;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export async function getAllTruths(): Promise<TruthEntry[]> {
  return await fetchOS<TruthEntry[]>("/truth");
}

export async function getTruth(name: string): Promise<TruthEntry> {
  return await fetchOS<TruthEntry>(`/truth/${name}`);
}

export async function getUnprovenTruths(): Promise<TruthEntry[]> {
  return await fetchOS<TruthEntry[]>("/truth/audit/unproven");
}

export async function getBrokenTruths(): Promise<TruthEntry[]> {
  return await fetchOS<TruthEntry[]>("/truth/audit/broken");
}

// ============================================================================
// SECTORS
// ============================================================================

export interface Sector {
  id: number;
  name: string;
  displayName: string;
  description: string;
  flag?: string;
  onboardingRules: {
    requiredFields: string[];
    ageVerification: boolean;
    identityVerification: boolean;
    contentWarning: boolean;
    customSteps?: string[];
  };
  allowedContentTypes: string[];
  monetizationRules: {
    tipsEnabled: boolean;
    subscriptionsEnabled: boolean;
    ppmEnabled: boolean;
    minPayout: number;
    payoutCurrency: string;
  };
  payoutSplits: {
    tips: number;
    subscriptions: number;
    ppm: number;
    platform: number;
  };
  complianceFlags: string[];
  languageDefault: string;
  currencyDefault: string;
  platformAccess: {
    vaultLive: boolean;
    posting: boolean;
    messaging: boolean;
    courses: boolean;
    ads: boolean;
  };
  active: boolean;
}

export async function getAllSectors(): Promise<Sector[]> {
  return await fetchOS<Sector[]>("/sectors");
}

export async function getSector(name: string): Promise<Sector> {
  return await fetchOS<Sector>(`/sectors/${name}`);
}

// ============================================================================
// PEOPLE
// ============================================================================

export interface Person {
  id: number;
  name: string;
  role: string;
  sectors: string[];
  country?: string;
  city?: string;
  email?: string;
  phone?: string;
  telegram?: string;
  whatsapp?: string;
  instagram?: string;
  tiktok?: string;
  twitter?: string;
  notes?: string;
  tags?: string[];
  status: string;
  referredBy?: number;
  recruiterFor?: number[];
  lastContactedAt?: Date;
}

export async function getAllPeople(): Promise<Person[]> {
  return await fetchOS<Person[]>("/people");
}

export async function getPerson(id: number): Promise<Person> {
  return await fetchOS<Person>(`/people/${id}`);
}

export async function getPeopleByRole(role: string): Promise<Person[]> {
  return await fetchOS<Person[]>(`/people/role/${role}`);
}

export async function getPeopleBySector(sector: string): Promise<Person[]> {
  return await fetchOS<Person[]>(`/people/sector/${sector}`);
}

// ============================================================================
// EXECUTION TASKS
// ============================================================================

export interface ExecutionTask {
  id: number;
  title: string;
  description: string;
  assignedTo?: string;
  assignedAt?: Date;
  status: "pending" | "in_progress" | "blocked" | "completed" | "failed";
  priority: number;
  completionCriteria: string[];
  verificationSteps: string[];
  proofArtifact?: string;
  relatedFeature?: string;
  relatedPerson?: number;
  relatedSector?: string;
  executionLog?: Array<{
    timestamp: Date;
    agent: string;
    action: string;
    result: string;
  }>;
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;
}

export async function getAllTasks(): Promise<ExecutionTask[]> {
  return await fetchOS<ExecutionTask[]>("/tasks");
}

export async function getTask(id: number): Promise<ExecutionTask> {
  return await fetchOS<ExecutionTask>(`/tasks/${id}`);
}

export async function getTasksByStatus(status: string): Promise<ExecutionTask[]> {
  return await fetchOS<ExecutionTask[]>(`/tasks/status/${status}`);
}

export async function getPendingTasks(): Promise<ExecutionTask[]> {
  return await fetchOS<ExecutionTask[]>("/tasks/queue/pending");
}

// ============================================================================
// VALIDATIONS
// ============================================================================

export interface ValidationStats {
  total: number;
  passed: number;
  failed: number;
  partial: number;
  averageScore: number;
}

export async function getValidationStats(): Promise<ValidationStats> {
  return await fetchOS<ValidationStats>("/validations");
}

export async function getFailedValidations(): Promise<any[]> {
  return await fetchOS<any[]>("/validations/audit/failed");
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function checkOSHealth(): Promise<{ status: string; timestamp: Date }> {
  return await fetchOS<{ status: string; timestamp: Date }>("/health");
}
