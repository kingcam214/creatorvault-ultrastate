import { spawnSync } from "node:child_process";

export const WORKFLOW_FILE_PATH = ".github/workflows/deploy.yml";
export const INVALID_PROBE_SHA = "0".repeat(40);

export class WorkflowPermissionFailure extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "WorkflowPermissionFailure";
  }
}

export type GitHubCliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type GitHubCliExecutor = (
  args: readonly string[],
  input?: string
) => GitHubCliResult;

export type WorkflowPermissionEvidence = {
  status: "VERIFIED";
  getStderr: "empty" | "diagnostic";
  probeStderr: "diagnostic";
};

function requirePermission(
  condition: unknown,
  code: string
): asserts condition {
  if (!condition) throw new WorkflowPermissionFailure(code);
}

function record(value: unknown, code: string): Record<string, unknown> {
  requirePermission(
    typeof value === "object" && value !== null && !Array.isArray(value),
    code
  );
  return value as Record<string, unknown>;
}

function hasTerminalControl(text: string): boolean {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text);
}

/**
 * Parses only a single clean JSON object from standard output. Stderr is never
 * interpreted as JSON because GitHub CLI uses it for diagnostics.
 */
export function parseCleanJsonStdout(stdout: string): Record<string, unknown> {
  requirePermission(stdout.trim().length > 0, "GITHUB_CLI_EMPTY_STDOUT");
  requirePermission(
    !hasTerminalControl(stdout),
    "GITHUB_CLI_STDOUT_CONTROL_SEQUENCE"
  );
  try {
    return record(JSON.parse(stdout) as unknown, "GITHUB_CLI_UNEXPECTED_JSON");
  } catch (error: unknown) {
    if (error instanceof WorkflowPermissionFailure) throw error;
    throw new WorkflowPermissionFailure("GITHUB_CLI_MALFORMED_JSON");
  }
}

/** A successful GitHub API call may emit human diagnostics on stderr. */
export function parseSuccessfulJsonResponse(
  result: GitHubCliResult
): Record<string, unknown> {
  requirePermission(result.exitCode === 0, "GITHUB_CLI_GET_FAILED");
  return parseCleanJsonStdout(result.stdout);
}

/**
 * `gh api --jq .content` produces base64 source bytes without terminal JSON
 * formatting. This rejects all noise rather than trying to strip it.
 */
export function parseBase64ContentStdout(stdout: string): string {
  requirePermission(stdout.length > 0, "GITHUB_CLI_EMPTY_STDOUT");
  requirePermission(
    !hasTerminalControl(stdout),
    "GITHUB_CLI_STDOUT_CONTROL_SEQUENCE"
  );
  requirePermission(
    /^[A-Za-z0-9+/=\r\n]+$/.test(stdout),
    "GITHUB_CLI_STDOUT_NOT_BASE64"
  );
  const compact = stdout.replace(/[\r\n]/g, "");
  requirePermission(
    compact.length > 0 &&
      compact.length % 4 === 0 &&
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        compact
      ),
    "GITHUB_CLI_STDOUT_NOT_BASE64"
  );
  return compact;
}

function permissionDenied(stderr: string): boolean {
  return /resource not accessible by integration|workflow(?:s)?[^\n]*permission|must have[^\n]*workflow/i.test(
    stderr
  );
}

/**
 * `--silent` guarantees no response body in stdout. The exact 409 diagnostic
 * is the sole accepted result: it means GitHub evaluated an update request for
 * the workflow path and rejected only the deliberately nonexistent SHA.
 */
export function assertInvalidShaConflict(result: GitHubCliResult): void {
  requirePermission(result.stdout === "", "GITHUB_CLI_UNEXPECTED_PROBE_STDOUT");
  if (permissionDenied(result.stderr)) {
    throw new WorkflowPermissionFailure("WORKFLOW_PERMISSION_DENIED");
  }
  const expected = `gh: ${WORKFLOW_FILE_PATH} does not match ${INVALID_PROBE_SHA} (HTTP 409)\n`;
  requirePermission(
    result.exitCode === 1 && result.stderr === expected,
    "WORKFLOW_PERMISSION_NOT_VERIFIED"
  );
}

function environment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NO_COLOR: "1",
    CLICOLOR: "0",
    TERM: "dumb",
    PAGER: "cat",
    GH_PAGER: "cat",
  };
}

/** Runs the GitHub CLI with stdout and stderr retained as separate channels. */
export const executeGitHubCli: GitHubCliExecutor = (args, input) => {
  const result = spawnSync("gh", [...args], {
    encoding: "utf8",
    env: environment(),
    input,
    maxBuffer: 1024 * 1024,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.error || result.signal || result.status === null) {
    throw new WorkflowPermissionFailure("GITHUB_CLI_EXECUTION_FAILED");
  }
  return {
    exitCode: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
};

/**
 * Makes one harmless workflow-file update request with an impossible SHA. It
 * cannot create a commit; any result other than the exact 409 is fail-closed.
 */
export function verifyWorkflowPermission(
  repository: string,
  execute: GitHubCliExecutor = executeGitHubCli
): WorkflowPermissionEvidence {
  requirePermission(
    /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository),
    "INVALID_GITHUB_REPOSITORY"
  );
  const endpoint = `repos/${repository}/contents/${WORKFLOW_FILE_PATH}`;
  const contentResult = execute([
    "api",
    "--hostname",
    "github.com",
    "--method",
    "GET",
    `${endpoint}?ref=main`,
    "--jq",
    ".content",
  ]);
  requirePermission(contentResult.exitCode === 0, "GITHUB_CLI_GET_FAILED");
  const content = parseBase64ContentStdout(contentResult.stdout);
  const input = JSON.stringify({
    message: "authorization-only invalid SHA probe; cannot commit",
    content,
    sha: INVALID_PROBE_SHA,
    branch: "main",
  });
  const probeResult = execute(
    [
      "api",
      "--hostname",
      "github.com",
      "--method",
      "PUT",
      endpoint,
      "--input",
      "-",
      "--silent",
    ],
    input
  );
  assertInvalidShaConflict(probeResult);
  return {
    status: "VERIFIED",
    getStderr: contentResult.stderr === "" ? "empty" : "diagnostic",
    probeStderr: "diagnostic",
  };
}

const directInvocation = process.argv[1]?.endsWith(
  "githubWorkflowPermissionPreflight.ts"
);
if (directInvocation) {
  try {
    const repository = process.argv[2] ?? "kingcam214/creatorvault-ultrastate";
    verifyWorkflowPermission(repository);
    process.stdout.write("WORKFLOW PERMISSION: VERIFIED\n");
  } catch {
    process.stderr.write("WORKFLOW PERMISSION: NOT VERIFIED\n");
    process.exitCode = 1;
  }
}
