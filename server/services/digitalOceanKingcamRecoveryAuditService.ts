import { getDigitalOceanVaceAutomationState } from "./digitalOceanVaceAutomationService";

const DIGITALOCEAN_API_BASE = "https://api.digitalocean.com/v2";
const DIGITALOCEAN_TOKEN_ENVIRONMENT_KEY = "DIGITALOCEAN_VACE_AUTOMATION_TOKEN";

type Droplet = {
  id?: number;
  name?: string;
  status?: string;
  created_at?: string;
  size_slug?: string;
  region?: { slug?: string };
  tags?: string[];
  image?: { slug?: string; distribution?: string };
  networks?: { v4?: Array<{ type?: string }> };
};

type Action = {
  id?: number;
  type?: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  resource_type?: string;
  resource_id?: number;
  region?: { slug?: string };
};

type SshKey = { id?: number; name?: string; fingerprint?: string };

export type KingcamDigitalOceanRecoveryAudit = {
  auditOnly: true;
  providerConfigured: boolean;
  createdOrModifiedResources: false;
  access: {
    accountReadable: boolean;
    dropletsReadable: boolean;
    actionsReadable: boolean;
    sshKeysReadable: boolean;
    createDropletAuthorized: false;
    createDropletFailure: "forbidden" | "not_tested" | "unknown";
  };
  droplets: Array<{
    id: number;
    name: string;
    status: string;
    createdAt: string | null;
    size: string | null;
    region: string | null;
    tags: string[];
    image: string | null;
    hasPublicNetwork: boolean;
    cloneRelated: boolean;
  }>;
  recentActions: Array<{
    id: number;
    type: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    resourceType: string;
    resourceId: number | null;
    region: string | null;
    cloneRelated: boolean;
  }>;
  sshKeyCount: number | null;
  finding: string;
};

export class DigitalOceanKingcamRecoveryAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DigitalOceanKingcamRecoveryAuditError";
  }
}

function token(): string {
  const value = String(process.env[DIGITALOCEAN_TOKEN_ENVIRONMENT_KEY] || "").trim();
  if (!value) throw new DigitalOceanKingcamRecoveryAuditError("CreatorVault has no configured DigitalOcean automation credential to audit.");
  return value;
}

async function getJson<T>(path: string): Promise<{ ok: boolean; status: number; value: T | null }> {
  try {
    const response = await fetch(`${DIGITALOCEAN_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return { ok: false, status: response.status, value: null };
    return { ok: true, status: response.status, value: await response.json() as T };
  } catch {
    return { ok: false, status: 0, value: null };
  }
}

function isCloneRelated(value: unknown): boolean {
  return /kingcam|creatorvault|wan|vace|gpu|performer/i.test(JSON.stringify(value || ""));
}

/**
 * This audit sends GET requests only. It never invokes creation, deletion, resize,
 * billing, action, or model-generation endpoints.
 */
export async function auditPriorKingcamDigitalOceanRun(): Promise<KingcamDigitalOceanRecoveryAudit> {
  const configured = getDigitalOceanVaceAutomationState().configured;
  if (!configured) {
    return {
      auditOnly: true,
      providerConfigured: false,
      createdOrModifiedResources: false,
      access: { accountReadable: false, dropletsReadable: false, actionsReadable: false, sshKeysReadable: false, createDropletAuthorized: false, createDropletFailure: "not_tested" },
      droplets: [],
      recentActions: [],
      sshKeyCount: null,
      finding: "CreatorVault has no configured DigitalOcean credential to inspect.",
    };
  }

  const [account, droplets, actions, sshKeys] = await Promise.all([
    getJson<{ account?: { uuid?: string } }>("/account"),
    getJson<{ droplets?: Droplet[] }>("/droplets?per_page=200"),
    getJson<{ actions?: Action[] }>("/actions?per_page=200"),
    getJson<{ ssh_keys?: SshKey[] }>("/account/keys?per_page=200"),
  ]);
  const listedDroplets = (droplets.value?.droplets || []).map((droplet) => ({
    id: Number(droplet.id || 0),
    name: String(droplet.name || "unnamed"),
    status: String(droplet.status || "unknown"),
    createdAt: droplet.created_at || null,
    size: droplet.size_slug || null,
    region: droplet.region?.slug || null,
    tags: Array.isArray(droplet.tags) ? droplet.tags.map(String) : [],
    image: droplet.image?.slug || droplet.image?.distribution || null,
    hasPublicNetwork: Boolean((droplet.networks?.v4 || []).some((network) => network.type === "public")),
    cloneRelated: isCloneRelated({ name: droplet.name, tags: droplet.tags, size: droplet.size_slug }),
  })).filter((droplet) => droplet.id > 0);
  const listedActions = (actions.value?.actions || []).map((action) => ({
    id: Number(action.id || 0),
    type: String(action.type || "unknown"),
    status: String(action.status || "unknown"),
    startedAt: action.started_at || null,
    completedAt: action.completed_at || null,
    resourceType: String(action.resource_type || "unknown"),
    resourceId: Number.isInteger(Number(action.resource_id)) ? Number(action.resource_id) : null,
    region: action.region?.slug || null,
    cloneRelated: isCloneRelated({ type: action.type, resourceType: action.resource_type, region: action.region?.slug }),
  })).filter((action) => action.id > 0).sort((a, b) => String(b.startedAt || "").localeCompare(String(a.startedAt || ""))).slice(0, 80);
  const cloneDroplets = listedDroplets.filter((droplet) => droplet.cloneRelated);
  const relevantActions = listedActions.filter((action) => action.cloneRelated || action.type === "create" || action.type === "destroy");
  const createForbidden = !droplets.ok && droplets.status === 403 ? "forbidden" : "not_tested";

  let finding = "The audit found no tagged KingCam, Wan, VACE, GPU, or CreatorVault cloud resource under this credential.";
  if (cloneDroplets.length) finding = `The audit found ${cloneDroplets.length} tagged KingCam or CreatorVault cloud resource(s). Their status is listed for recovery; no resource was changed.`;
  else if (listedDroplets.length) finding = `The audit found ${listedDroplets.length} existing cloud machine(s), but none is tagged as KingCam, Wan, VACE, GPU, or CreatorVault. They are preserved and not treated as safe clone workers without further evidence.`;
  if (!account.ok || !droplets.ok) finding = "The DigitalOcean credential can no longer complete the read-only recovery audit. No cloud resource was changed.";

  return {
    auditOnly: true,
    providerConfigured: configured,
    createdOrModifiedResources: false,
    access: {
      accountReadable: account.ok,
      dropletsReadable: droplets.ok,
      actionsReadable: actions.ok,
      sshKeysReadable: sshKeys.ok,
      createDropletAuthorized: false,
      createDropletFailure: createForbidden,
    },
    droplets: listedDroplets,
    recentActions: relevantActions,
    sshKeyCount: sshKeys.ok ? (sshKeys.value?.ssh_keys || []).length : null,
    finding,
  };
}
