import { describe, expect, it } from "vitest";
import {
  assertInvalidShaConflict,
  INVALID_PROBE_SHA,
  parseBase64ContentStdout,
  parseCleanJsonStdout,
  parseSuccessfulJsonResponse,
  verifyWorkflowPermission,
  WORKFLOW_FILE_PATH,
  WorkflowPermissionFailure,
  type GitHubCliExecutor,
  type GitHubCliResult,
} from "./githubWorkflowPermissionPreflight";

const encodedWorkflow = Buffer.from("name: deployment\n", "utf8").toString(
  "base64"
);
const expectedConflict = `gh: ${WORKFLOW_FILE_PATH} does not match ${INVALID_PROBE_SHA} (HTTP 409)\n`;

function result(patch: Partial<GitHubCliResult> = {}): GitHubCliResult {
  return { exitCode: 0, stdout: "", stderr: "", ...patch };
}

function expectFailure(action: () => unknown, code: string): void {
  expect(action).toThrowError(new WorkflowPermissionFailure(code));
}

function verifiedExecutor(getStderr = ""): GitHubCliExecutor {
  let calls = 0;
  return (args, input) => {
    calls += 1;
    if (calls === 1) {
      expect(args).toEqual([
        "api",
        "--hostname",
        "github.com",
        "--method",
        "GET",
        `repos/kingcam214/creatorvault-ultrastate/contents/${WORKFLOW_FILE_PATH}?ref=main`,
        "--jq",
        ".content",
      ]);
      expect(input).toBeUndefined();
      return result({ stdout: `${encodedWorkflow}\n`, stderr: getStderr });
    }
    expect(calls).toBe(2);
    expect(args).toEqual([
      "api",
      "--hostname",
      "github.com",
      "--method",
      "PUT",
      `repos/kingcam214/creatorvault-ultrastate/contents/${WORKFLOW_FILE_PATH}`,
      "--input",
      "-",
      "--silent",
    ]);
    const request = JSON.parse(input ?? "") as Record<string, unknown>;
    expect(request).toEqual({
      message: "authorization-only invalid SHA probe; cannot commit",
      content: encodedWorkflow,
      sha: INVALID_PROBE_SHA,
      branch: "main",
    });
    return result({ exitCode: 1, stderr: expectedConflict });
  };
}

describe("GitHub workflow-permission preflight output parsing", () => {
  it("parses one clean JSON object from stdout", () => {
    expect(parseCleanJsonStdout('{"status":"409"}\n')).toEqual({
      status: "409",
    });
  });

  it("treats stderr warnings as diagnostic text while accepting valid stdout JSON", () => {
    expect(
      parseSuccessfulJsonResponse(
        result({
          stdout: '{"content":"YWJj"}\n',
          stderr: "warning: transient non-JSON diagnostic\n",
        })
      )
    ).toEqual({ content: "YWJj" });
  });

  it.each([
    '\u001b[31m{"status":"409"}\u001b[0m\n',
    'notice: output follows\n{"status":"409"}\n',
  ])("rejects ANSI or text noise in stdout", stdout => {
    expect(() => parseCleanJsonStdout(stdout)).toThrow(
      WorkflowPermissionFailure
    );
  });

  it.each([
    ["", "GITHUB_CLI_EMPTY_STDOUT"],
    ["   \n", "GITHUB_CLI_EMPTY_STDOUT"],
    ["{not-json}\n", "GITHUB_CLI_MALFORMED_JSON"],
    ["[]\n", "GITHUB_CLI_UNEXPECTED_JSON"],
  ])("rejects empty, malformed, or unexpected JSON output", (stdout, code) => {
    expectFailure(() => parseCleanJsonStdout(stdout), code);
  });

  it.each([
    ["\u001b[32mYWJj\u001b[0m\n", "GITHUB_CLI_STDOUT_CONTROL_SEQUENCE"],
    ["notice\nYWJj\n", "GITHUB_CLI_STDOUT_NOT_BASE64"],
    ["YWJj*\n", "GITHUB_CLI_STDOUT_NOT_BASE64"],
  ])("rejects contaminated machine base64 output", (stdout, code) => {
    expectFailure(() => parseBase64ContentStdout(stdout), code);
  });

  it("classifies a real workflow permission denial as a failure", () => {
    expectFailure(
      () =>
        assertInvalidShaConflict(
          result({
            exitCode: 1,
            stderr: "gh: Resource not accessible by integration (HTTP 403)\n",
          })
        ),
      "WORKFLOW_PERMISSION_DENIED"
    );
  });

  it("accepts only the intentional invalid-SHA conflict", () => {
    expect(() =>
      assertInvalidShaConflict(
        result({ exitCode: 1, stderr: expectedConflict })
      )
    ).not.toThrow();
  });

  it.each([
    result({ exitCode: 0, stderr: expectedConflict }),
    result({
      exitCode: 1,
      stdout: '{"status":"409"}\n',
      stderr: expectedConflict,
    }),
    result({ exitCode: 1, stderr: "gh: unrelated conflict (HTTP 409)\n" }),
  ])(
    "rejects a conflict result that is not the exact workflow-file probe",
    probe => {
      expect(() => assertInvalidShaConflict(probe)).toThrow(
        WorkflowPermissionFailure
      );
    }
  );

  it("uses a real non-mutating workflow endpoint probe and verifies only its exact conflict", () => {
    expect(
      verifyWorkflowPermission(
        "kingcam214/creatorvault-ultrastate",
        verifiedExecutor("warning: harmless diagnostic\n")
      )
    ).toEqual({
      status: "VERIFIED",
      getStderr: "diagnostic",
      probeStderr: "diagnostic",
    });
  });

  it("fails closed before the probe when selected workflow content is not clean machine output", () => {
    const executor: GitHubCliExecutor = () =>
      result({ stdout: "notice\nYWJj\n" });
    expectFailure(
      () =>
        verifyWorkflowPermission(
          "kingcam214/creatorvault-ultrastate",
          executor
        ),
      "GITHUB_CLI_STDOUT_NOT_BASE64"
    );
  });
});
