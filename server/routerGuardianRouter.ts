import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export const routerGuardianRouter = router({
  runAudit: protectedProcedure.mutation(async ({ ctx }) => {
    // @ts-ignore
    if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
      throw new Error("Owner access required");
    }
    try {
      const { stdout } = await execAsync("node /root/creatorvault/router-guardian.mjs json", { timeout: 15000 });
      const result = JSON.parse(stdout.trim());
      return result;
    } catch (err: any) {
      // Even if exit code 1 (missing routers), parse stdout
      if (err.stdout) {
        try {
          return JSON.parse(err.stdout.trim());
        } catch {}
      }
      return { error: err.message, timestamp: new Date().toISOString() };
    }
  }),
  
  getLastAudit: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
      throw new Error("Owner access required");
    }
    const logPath = "/root/creatorvault/guardian_audit.log";
    if (fs.existsSync(logPath)) {
      const data = fs.readFileSync(logPath, "utf8");
      return JSON.parse(data);
    }
    return { message: "No audit run yet", timestamp: null };
  }),
  
  getSystemHealth: protectedProcedure.query(async ({ ctx }) => {
    // @ts-ignore
    if (ctx.user.role !== "owner" && ctx.user.role !== "admin") {
      throw new Error("Owner access required");
    }
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
    };
  }),
});
