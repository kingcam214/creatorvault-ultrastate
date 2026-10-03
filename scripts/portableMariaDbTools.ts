import { spawn } from "node:child_process";
import { promises as fs, type Stats } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APT_GET = "/usr/bin/apt-get";
const DPKG_DEB = "/usr/bin/dpkg-deb";
const DPKG_ARCHITECTURE = "/usr/bin/dpkg-architecture";
const PRIVATE_MODE = 0o700;
const COMMAND_TIMEOUT_MS = 180_000;
const COMMAND_OUTPUT_LIMIT = 4 * 1024 * 1024;
const SYSTEM_PATH = "/usr/sbin:/usr/bin:/sbin:/bin";
const MARIADB_PACKAGES = [
  "mariadb-server-core",
  "mariadb-client",
  "mariadb-common",
] as const;
const MARIADB_DIRECT_ARCHIVE_PACKAGES = [
  ...MARIADB_PACKAGES,
  // mariadb-client is a meta package; the executable itself is in this
  // dependency, which may otherwise be absent when already host-installed.
  "mariadb-client-core",
  // This declared client-core dependency supplies the extracted native
  // /usr/lib/<multiarch>/libmariadb shared-library directory.
  "libmariadb3",
] as const;

export type PortableMariaDbTools = {
  installer: string;
  server: string;
  client: string;
  dump: string;
  libraryPath: string;
  basedir: string;
};

type PortableDbToolErrorCode =
  | "PORTABLE_DB_ROOT_REQUIRED"
  | "PORTABLE_DB_ROOT_DIRECTORY_INVALID"
  | "PORTABLE_DB_ROOT_PARENT_UNSAFE"
  | "PORTABLE_DB_CLI_ROOT_ARGUMENT_INVALID"
  | "PORTABLE_DB_TRUSTED_BINARY_INVALID"
  | "PORTABLE_DB_PRIVATE_DIRECTORY_CREATE_FAILED"
  | "PORTABLE_DB_APT_DOWNLOAD_FAILED"
  | "PORTABLE_DB_ARCHITECTURE_UNAVAILABLE"
  | "PORTABLE_DB_ARCHITECTURE_UNSUPPORTED"
  | "PORTABLE_DB_ARCHIVE_INVALID"
  | "PORTABLE_DB_EXTRACTION_FAILED"
  | "PORTABLE_DB_EXTRACTED_TREE_INVALID"
  | "PORTABLE_DB_REQUIRED_PATH_INVALID"
  | "PORTABLE_DB_LIBRARY_PATH_INVALID"
  | "PORTABLE_DB_PREPARATION_FAILED";

/** A deliberately context-free failure: command output and filesystem details stay private. */
export class PortableDbToolError extends Error {
  readonly code: PortableDbToolErrorCode;

  constructor(code: PortableDbToolErrorCode) {
    super(code);
    this.name = "PortableDbToolError";
    this.code = code;
  }
}

function failure(code: PortableDbToolErrorCode): never {
  throw new PortableDbToolError(code);
}

function isRootUser(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

/** Root is required because apt downloads must be root-owned and the caller owns the private tree. */
export function requireRoot(): void {
  if (!isRootUser()) failure("PORTABLE_DB_ROOT_REQUIRED");
}

function hasUnsafeWritePermission(metadata: Stats): boolean {
  return (metadata.mode & 0o022) !== 0;
}

function hasPrivateMode(metadata: Stats): boolean {
  return (metadata.mode & 0o777) === PRIVATE_MODE;
}

function isWithin(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function safeAbsolutePath(input: string): string {
  if (!path.isAbsolute(input)) failure("PORTABLE_DB_ROOT_DIRECTORY_INVALID");
  const resolved = path.resolve(input);
  if (resolved !== input || resolved === path.parse(resolved).root)
    failure("PORTABLE_DB_ROOT_DIRECTORY_INVALID");
  return resolved;
}

async function lstatOrFail(
  target: string,
  code: PortableDbToolErrorCode
): Promise<Stats> {
  try {
    return await fs.lstat(target);
  } catch {
    return failure(code);
  }
}

async function realpathOrFail(
  target: string,
  code: PortableDbToolErrorCode
): Promise<string> {
  try {
    return await fs.realpath(target);
  } catch {
    return failure(code);
  }
}

async function assertPrivateRootDirectory(rootDir: string): Promise<string> {
  const absolute = safeAbsolutePath(rootDir);
  const metadata = await lstatOrFail(
    absolute,
    "PORTABLE_DB_ROOT_DIRECTORY_INVALID"
  );
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    metadata.uid !== 0 ||
    !hasPrivateMode(metadata)
  )
    failure("PORTABLE_DB_ROOT_DIRECTORY_INVALID");

  const canonical = await realpathOrFail(
    absolute,
    "PORTABLE_DB_ROOT_DIRECTORY_INVALID"
  );
  if (canonical !== absolute) failure("PORTABLE_DB_ROOT_DIRECTORY_INVALID");
  return canonical;
}

/**
 * Accept only root-owned non-writable parents, except the root-owned sticky /tmp
 * required by the explicitly allowed regression-fixture location.
 */
async function assertProtectedParents(rootDir: string): Promise<void> {
  const segments = rootDir.split(path.sep).filter(Boolean);
  let current = path.parse(rootDir).root;

  const filesystemRoot = await lstatOrFail(
    current,
    "PORTABLE_DB_ROOT_PARENT_UNSAFE"
  );
  if (
    !filesystemRoot.isDirectory() ||
    filesystemRoot.isSymbolicLink() ||
    filesystemRoot.uid !== 0 ||
    hasUnsafeWritePermission(filesystemRoot)
  )
    failure("PORTABLE_DB_ROOT_PARENT_UNSAFE");

  for (let index = 0; index < segments.length - 1; index += 1) {
    current = path.join(current, segments[index]);
    const metadata = await lstatOrFail(
      current,
      "PORTABLE_DB_ROOT_PARENT_UNSAFE"
    );
    if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.uid !== 0)
      failure("PORTABLE_DB_ROOT_PARENT_UNSAFE");

    const isTmp = current === "/tmp";
    const safeStickyTmp =
      isTmp &&
      (metadata.mode & 0o1000) !== 0 &&
      (metadata.mode & 0o777) === 0o777;
    if (!safeStickyTmp && hasUnsafeWritePermission(metadata))
      failure("PORTABLE_DB_ROOT_PARENT_UNSAFE");
  }
}

async function assertTrustedSystemBinary(binary: string): Promise<string> {
  const metadata = await lstatOrFail(binary, "PORTABLE_DB_TRUSTED_BINARY_INVALID");
  if (
    (!metadata.isFile() && !metadata.isSymbolicLink()) ||
    metadata.uid !== 0 ||
    hasUnsafeWritePermission(metadata)
  )
    failure("PORTABLE_DB_TRUSTED_BINARY_INVALID");

  const canonical = await realpathOrFail(
    binary,
    "PORTABLE_DB_TRUSTED_BINARY_INVALID"
  );
  if (!isWithin("/usr/bin", canonical))
    failure("PORTABLE_DB_TRUSTED_BINARY_INVALID");

  const target = await lstatOrFail(canonical, "PORTABLE_DB_TRUSTED_BINARY_INVALID");
  if (!target.isFile() || target.uid !== 0 || hasUnsafeWritePermission(target))
    failure("PORTABLE_DB_TRUSTED_BINARY_INVALID");

  for (const directory of ["/", "/usr", "/usr/bin"]) {
    const parent = await lstatOrFail(
      directory,
      "PORTABLE_DB_TRUSTED_BINARY_INVALID"
    );
    if (
      !parent.isDirectory() ||
      parent.isSymbolicLink() ||
      parent.uid !== 0 ||
      hasUnsafeWritePermission(parent)
    )
      failure("PORTABLE_DB_TRUSTED_BINARY_INVALID");
  }
  return canonical;
}

async function createPrivateDirectory(
  parent: string,
  name: string
): Promise<string> {
  const destination = path.join(parent, name);
  try {
    await fs.mkdir(destination, { mode: PRIVATE_MODE });
    await fs.chmod(destination, PRIVATE_MODE);
  } catch {
    return failure("PORTABLE_DB_PRIVATE_DIRECTORY_CREATE_FAILED");
  }

  const metadata = await lstatOrFail(
    destination,
    "PORTABLE_DB_PRIVATE_DIRECTORY_CREATE_FAILED"
  );
  if (
    !metadata.isDirectory() ||
    metadata.isSymbolicLink() ||
    metadata.uid !== 0 ||
    !hasPrivateMode(metadata)
  )
    failure("PORTABLE_DB_PRIVATE_DIRECTORY_CREATE_FAILED");

  const entries = await fs.readdir(destination).catch(() =>
    failure("PORTABLE_DB_PRIVATE_DIRECTORY_CREATE_FAILED")
  );
  if (entries.length !== 0) failure("PORTABLE_DB_PRIVATE_DIRECTORY_CREATE_FAILED");
  return destination;
}

function childEnvironment(extra?: Readonly<Record<string, string>>): NodeJS.ProcessEnv {
  return {
    PATH: SYSTEM_PATH,
    HOME: "/root",
    LANG: "C",
    LC_ALL: "C",
    DEBIAN_FRONTEND: "noninteractive",
    ...extra,
  };
}

/**
 * Environment for a MariaDB tool child process. It never mutates process.env and
 * deliberately omits Node preload/module variables.
 */
export function portableMariaDbServiceEnvironment(
  libraryPath: string
): NodeJS.ProcessEnv {
  if (libraryPath.length === 0) failure("PORTABLE_DB_LIBRARY_PATH_INVALID");
  return childEnvironment({ LD_LIBRARY_PATH: libraryPath });
}

type CommandResult = {
  stdout: Buffer;
  stderr: Buffer;
};

async function captureCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  timeoutMs: number
): Promise<CommandResult> {
  return new Promise<CommandResult>((resolve, reject) => {
    let settled = false;
    let stdoutSize = 0;
    let stderrSize = 0;
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const child = spawn(command, [...args], {
      cwd,
      env: childEnvironment(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    const finish = (handler: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handler();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("COMMAND_TIMEOUT")));
    }, timeoutMs);

    const capture = (
      chunks: Buffer[],
      currentSize: number,
      chunk: Buffer
    ): number => {
      const nextSize = currentSize + chunk.length;
      if (nextSize > COMMAND_OUTPUT_LIMIT) {
        child.kill("SIGKILL");
        finish(() => reject(new Error("COMMAND_OUTPUT_LIMIT")));
        return currentSize;
      }
      chunks.push(chunk);
      return nextSize;
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutSize = capture(stdoutChunks, stdoutSize, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrSize = capture(stderrChunks, stderrSize, chunk);
    });
    child.once("error", () => finish(() => reject(new Error("COMMAND_START"))));
    child.once("close", (code: number | null, signal: NodeJS.Signals | null) => {
      if (code === 0 && signal === null)
        finish(() =>
          resolve({
            stdout: Buffer.concat(stdoutChunks),
            stderr: Buffer.concat(stderrChunks),
          })
        );
      else finish(() => reject(new Error("COMMAND_FAILED")));
    });
  });
}

/** Pure apt invocation arguments: download-only is redundant in both flag and config form. */
export function portableDownloadArgs(rootDir: string): string[] {
  const root = path.resolve(rootDir);
  const archives = path.join(root, "archives");
  const partial = path.join(archives, "partial");
  return [
    "-y",
    "--download-only",
    "--no-install-recommends",
    "-o",
    "APT::Get::Download-Only=true",
    "-o",
    "APT::Get::Assume-Yes=true",
    "-o",
    "APT::Get::Install-Recommends=false",
    "-o",
    `Dir::Cache::archives=${archives}`,
    "-o",
    `Dir::Cache::archives::partial=${partial}`,
    "-o",
    "Dir::Cache::pkgcache=",
    "-o",
    "Dir::Cache::srcpkgcache=",
    "install",
    ...MARIADB_PACKAGES,
  ];
}

/** apt-get download writes direct package archives to its private current directory. */
function portableDirectDownloadArgs(): string[] {
  return [
    "-o",
    "APT::Get::Install-Recommends=false",
    "-o",
    "Dir::Cache::pkgcache=",
    "-o",
    "Dir::Cache::srcpkgcache=",
    "download",
    ...MARIADB_DIRECT_ARCHIVE_PACKAGES,
  ];
}

/** Map Node or dpkg architecture spellings to a safe GNU multiarch directory name. */
export function libraryPathForArchitecture(architecture: string): string {
  const normalized = architecture.trim().toLowerCase();
  const mappings: Readonly<Record<string, string>> = {
    x64: "x86_64-linux-gnu",
    x86_64: "x86_64-linux-gnu",
    amd64: "x86_64-linux-gnu",
    "x86_64-linux-gnu": "x86_64-linux-gnu",
    arm64: "aarch64-linux-gnu",
    aarch64: "aarch64-linux-gnu",
    "aarch64-linux-gnu": "aarch64-linux-gnu",
    arm: "arm-linux-gnueabihf",
    armv7l: "arm-linux-gnueabihf",
    "arm-linux-gnueabihf": "arm-linux-gnueabihf",
  };
  const mapped = mappings[normalized];
  if (mapped !== undefined) return mapped;
  if (/^[a-z0-9][a-z0-9-]*-linux-gnu(?:[a-z0-9-]*)?$/.test(normalized))
    return normalized;
  return failure("PORTABLE_DB_ARCHITECTURE_UNSUPPORTED");
}

async function nativeArchitecture(): Promise<string> {
  try {
    const trusted = await assertTrustedSystemBinary(DPKG_ARCHITECTURE);
    const result = await captureCommand(
      trusted,
      ["-qDEB_HOST_MULTIARCH"],
      "/",
      15_000
    );
    return libraryPathForArchitecture(result.stdout.toString("utf8"));
  } catch (error) {
    if (
      error instanceof PortableDbToolError &&
      error.code === "PORTABLE_DB_ARCHITECTURE_UNSUPPORTED"
    )
      throw error;
    try {
      return libraryPathForArchitecture(process.arch);
    } catch {
      return failure("PORTABLE_DB_ARCHITECTURE_UNAVAILABLE");
    }
  }
}

async function downloadedArchives(archives: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(archives);
  } catch {
    return failure("PORTABLE_DB_ARCHIVE_INVALID");
  }

  const packages: string[] = [];
  for (const entry of entries) {
    if (entry === "partial" || entry === "lock") continue;
    if (!entry.endsWith(".deb")) failure("PORTABLE_DB_ARCHIVE_INVALID");
    const archive = path.join(archives, entry);
    const metadata = await lstatOrFail(archive, "PORTABLE_DB_ARCHIVE_INVALID");
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.uid !== 0 ||
      metadata.size <= 0 ||
      hasUnsafeWritePermission(metadata)
    )
      failure("PORTABLE_DB_ARCHIVE_INVALID");
    packages.push(archive);
  }
  if (packages.length === 0) failure("PORTABLE_DB_ARCHIVE_INVALID");
  return packages.sort();
}

async function assertExtractedTreeContained(toolRoot: string): Promise<void> {
  const canonicalRoot = await realpathOrFail(
    toolRoot,
    "PORTABLE_DB_EXTRACTED_TREE_INVALID"
  );
  const inspect = async (directory: string): Promise<void> => {
    let entries: string[];
    try {
      entries = await fs.readdir(directory);
    } catch {
      return failure("PORTABLE_DB_EXTRACTED_TREE_INVALID");
    }
    for (const entry of entries) {
      const candidate = path.join(directory, entry);
      const metadata = await lstatOrFail(
        candidate,
        "PORTABLE_DB_EXTRACTED_TREE_INVALID"
      );
      if (metadata.isSymbolicLink()) {
        let target: string;
        try {
          target = await fs.readlink(candidate);
        } catch {
          return failure("PORTABLE_DB_EXTRACTED_TREE_INVALID");
        }
        const lexicalTarget = path.isAbsolute(target)
          ? path.normalize(target)
          : path.resolve(path.dirname(candidate), target);
        if (!isWithin(canonicalRoot, lexicalTarget))
          failure("PORTABLE_DB_EXTRACTED_TREE_INVALID");
        try {
          const canonical = await fs.realpath(candidate);
          if (!isWithin(canonicalRoot, canonical))
            failure("PORTABLE_DB_EXTRACTED_TREE_INVALID");
        } catch {
          // A dangling package link is inert. It is accepted only after the
          // lexical check above; paths used by the CLI must still resolve below.
        }
        continue;
      }
      const canonical = await realpathOrFail(
        candidate,
        "PORTABLE_DB_EXTRACTED_TREE_INVALID"
      );
      if (!isWithin(canonicalRoot, canonical))
        failure("PORTABLE_DB_EXTRACTED_TREE_INVALID");
      if (metadata.isDirectory()) {
        await inspect(candidate);
      } else if (!metadata.isFile()) {
        failure("PORTABLE_DB_EXTRACTED_TREE_INVALID");
      }
    }
  };
  await inspect(canonicalRoot);
}

async function assertContainedDirectory(
  candidate: string,
  canonicalRoot: string,
  code: PortableDbToolErrorCode
): Promise<string> {
  const metadata = await lstatOrFail(candidate, code);
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.uid !== 0)
    failure(code);
  const canonical = await realpathOrFail(candidate, code);
  if (!isWithin(canonicalRoot, canonical)) failure(code);
  const target = await lstatOrFail(canonical, code);
  if (!target.isDirectory() || target.uid !== 0 || hasUnsafeWritePermission(target))
    failure(code);
  return canonical;
}

async function assertContainedExecutable(
  candidate: string,
  canonicalRoot: string
): Promise<string> {
  const linkMetadata = await lstatOrFail(
    candidate,
    "PORTABLE_DB_REQUIRED_PATH_INVALID"
  );
  if (linkMetadata.uid !== 0 || hasUnsafeWritePermission(linkMetadata))
    failure("PORTABLE_DB_REQUIRED_PATH_INVALID");
  const canonical = await realpathOrFail(
    candidate,
    "PORTABLE_DB_REQUIRED_PATH_INVALID"
  );
  if (!isWithin(canonicalRoot, canonical))
    failure("PORTABLE_DB_REQUIRED_PATH_INVALID");
  const metadata = await lstatOrFail(canonical, "PORTABLE_DB_REQUIRED_PATH_INVALID");
  if (
    !metadata.isFile() ||
    metadata.uid !== 0 ||
    metadata.size <= 0 ||
    hasUnsafeWritePermission(metadata) ||
    (metadata.mode & 0o111) === 0
  )
    failure("PORTABLE_DB_REQUIRED_PATH_INVALID");
  return candidate;
}

async function usableExtractedLibraryDirectory(
  candidate: string,
  canonicalRoot: string
): Promise<string | undefined> {
  try {
    const canonical = await assertContainedDirectory(
      candidate,
      canonicalRoot,
      "PORTABLE_DB_LIBRARY_PATH_INVALID"
    );
    return canonical;
  } catch (error) {
    if (error instanceof PortableDbToolError) return undefined;
    return undefined;
  }
}

async function usableSystemLibraryDirectory(
  candidate: string
): Promise<string | undefined> {
  try {
    const canonical = await fs.realpath(candidate);
    if (!isWithin("/lib", canonical) && !isWithin("/usr/lib", canonical))
      return undefined;
    const metadata = await fs.stat(canonical);
    if (
      !metadata.isDirectory() ||
      metadata.uid !== 0 ||
      hasUnsafeWritePermission(metadata)
    )
      return undefined;
    return canonical;
  } catch {
    return undefined;
  }
}

async function libraryPathForToolRoot(
  toolRoot: string,
  architecture: string
): Promise<string> {
  const canonicalRoot = await realpathOrFail(
    toolRoot,
    "PORTABLE_DB_LIBRARY_PATH_INVALID"
  );
  const extractedCandidates = [
    path.join(toolRoot, "usr", "lib", architecture),
    path.join(toolRoot, "lib", architecture),
    path.join(toolRoot, "usr", "lib"),
    path.join(toolRoot, "lib"),
  ];
  const systemCandidates = [
    path.join("/usr/lib", architecture),
    path.join("/lib", architecture),
  ];
  const directories: string[] = [];

  for (const candidate of extractedCandidates) {
    const usable = await usableExtractedLibraryDirectory(candidate, canonicalRoot);
    if (usable !== undefined) directories.push(usable);
  }
  for (const candidate of systemCandidates) {
    const usable = await usableSystemLibraryDirectory(candidate);
    if (usable !== undefined) directories.push(usable);
  }

  const unique = [...new Set(directories)];
  if (unique.length === 0) failure("PORTABLE_DB_LIBRARY_PATH_INVALID");
  return unique.join(path.delimiter);
}

function fixedErrorCode(error: unknown): PortableDbToolErrorCode {
  if (error instanceof PortableDbToolError) return error.code;
  return "PORTABLE_DB_PREPARATION_FAILED";
}

/**
 * Download trusted APT archives into a caller-owned private directory and unpack
 * them with dpkg-deb only. No package installation or maintainer script execution
 * occurs; all child stdout/stderr remains captured in-memory and is discarded.
 */
export async function preparePortableMariaDbTools(
  rootDir: string
): Promise<PortableMariaDbTools> {
  try {
    requireRoot();
    const root = await assertPrivateRootDirectory(rootDir);
    await assertProtectedParents(root);
    const aptGet = await assertTrustedSystemBinary(APT_GET);
    const dpkgDeb = await assertTrustedSystemBinary(DPKG_DEB);

    const toolRoot = await createPrivateDirectory(root, "toolroot");
    const archives = await createPrivateDirectory(root, "archives");
    await createPrivateDirectory(archives, "partial");

    try {
      await captureCommand(
        aptGet,
        portableDownloadArgs(root),
        root,
        COMMAND_TIMEOUT_MS
      );
      // A download-only install can legitimately plan nothing when these packages
      // are already installed. Fetch direct candidates as well, while preserving
      // every dependency archive the download-only plan placed in archives.
      await captureCommand(
        aptGet,
        portableDirectDownloadArgs(),
        archives,
        COMMAND_TIMEOUT_MS
      );
    } catch {
      return failure("PORTABLE_DB_APT_DOWNLOAD_FAILED");
    }

    const archivesToExtract = await downloadedArchives(archives);
    for (const archive of archivesToExtract) {
      try {
        await captureCommand(dpkgDeb, ["-x", archive, toolRoot], root, COMMAND_TIMEOUT_MS);
      } catch {
        return failure("PORTABLE_DB_EXTRACTION_FAILED");
      }
    }

    await assertExtractedTreeContained(toolRoot);
    const canonicalToolRoot = await realpathOrFail(
      toolRoot,
      "PORTABLE_DB_EXTRACTED_TREE_INVALID"
    );
    const basedir = await assertContainedDirectory(
      path.join(toolRoot, "usr"),
      canonicalToolRoot,
      "PORTABLE_DB_REQUIRED_PATH_INVALID"
    );
    await assertContainedDirectory(
      path.join(toolRoot, "usr", "share", "mysql"),
      canonicalToolRoot,
      "PORTABLE_DB_REQUIRED_PATH_INVALID"
    );

    const installer = await assertContainedExecutable(
      path.join(toolRoot, "usr", "bin", "mariadb-install-db"),
      canonicalToolRoot
    );
    const server = await assertContainedExecutable(
      path.join(toolRoot, "usr", "sbin", "mariadbd"),
      canonicalToolRoot
    );
    const client = await assertContainedExecutable(
      path.join(toolRoot, "usr", "bin", "mariadb"),
      canonicalToolRoot
    );
    const dump = await assertContainedExecutable(
      path.join(toolRoot, "usr", "bin", "mariadb-dump"),
      canonicalToolRoot
    );
    const architecture = await nativeArchitecture();
    const libraryPath = await libraryPathForToolRoot(toolRoot, architecture);

    return { installer, server, client, dump, libraryPath, basedir };
  } catch (error) {
    throw new PortableDbToolError(fixedErrorCode(error));
  }
}

function allowedCliRootArgument(rootDir: string): boolean {
  if (!path.isAbsolute(rootDir) || path.resolve(rootDir) !== rootDir) return false;
  if (
    path.dirname(rootDir) === "/tmp" &&
    /^creatorvault-regressions\.[A-Za-z0-9_-]+$/.test(path.basename(rootDir))
  )
    return true;
  const parent = path.dirname(rootDir);
  if (path.basename(rootDir) === "portable-db-tools" &&
      path.dirname(parent) === "/tmp" &&
      /^creatorvault-regressions\.[A-Za-z0-9_-]+$/.test(path.basename(parent))) return true;

  const relative = path.relative("/root/creatorvault", rootDir).split(path.sep);
  return (
    relative.length === 2 &&
    /^\.consolidated-release-control-[a-f0-9]{40}$/.test(relative[0]) &&
    relative[1] === "portable-db-tools"
  );
}

/** The CLI accepts only a private regression fixture or the SHA-scoped release control tree. */
export function validPortableMariaDbCliArguments(args: readonly string[]): boolean {
  return (
    args.length === 2 &&
    args[0] === "--prepare" &&
    allowedCliRootArgument(args[1])
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (!validPortableMariaDbCliArguments(args)) {
    process.stderr.write("PORTABLE_DB_CLI_ROOT_ARGUMENT_INVALID\n");
    process.exitCode = 1;
    return;
  }
  try {
    const tools = await preparePortableMariaDbTools(args[1]);
    process.stdout.write(`${JSON.stringify(tools)}\n`);
  } catch (error) {
    process.stderr.write(`${fixedErrorCode(error)}\n`);
    process.exitCode = 1;
  }
}

function isDirectToolExecution(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) return false;
  const basename = path.basename(entry);
  if (basename !== "portableMariaDbTools.ts" && basename !== "portable-root-tools.mjs")
    return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
}

if (isDirectToolExecution()) void main();
