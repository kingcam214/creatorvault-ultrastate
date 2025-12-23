/**
 * 🦁 CREATORVAULT OS INTEGRATION ROUTER
 * 
 * Read-only access to OS authority system from CreatorVault app
 */

import { router, publicProcedure, protectedProcedure } from "../_core/trpc.js";
import * as osClient from "../_core/osClient.js";
import { z } from "zod";

export const osRouter = router({
  // Truth Registry
  getAllTruths: protectedProcedure.query(async () => {
    return await osClient.getAllTruths();
  }),

  getTruth: protectedProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return await osClient.getTruth(input.name);
    }),

  getUnprovenTruths: protectedProcedure.query(async () => {
    return await osClient.getUnprovenTruths();
  }),

  getBrokenTruths: protectedProcedure.query(async () => {
    return await osClient.getBrokenTruths();
  }),

  // Sectors
  getAllSectors: publicProcedure.query(async () => {
    return await osClient.getAllSectors();
  }),

  getSector: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      return await osClient.getSector(input.name);
    }),

  // People
  getAllPeople: protectedProcedure.query(async () => {
    return await osClient.getAllPeople();
  }),

  getPerson: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await osClient.getPerson(input.id);
    }),

  getPeopleByRole: protectedProcedure
    .input(z.object({ role: z.string() }))
    .query(async ({ input }) => {
      return await osClient.getPeopleByRole(input.role);
    }),

  getPeopleBySector: protectedProcedure
    .input(z.object({ sector: z.string() }))
    .query(async ({ input }) => {
      return await osClient.getPeopleBySector(input.sector);
    }),

  // Execution Tasks
  getAllTasks: protectedProcedure.query(async () => {
    return await osClient.getAllTasks();
  }),

  getTask: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await osClient.getTask(input.id);
    }),

  getPendingTasks: protectedProcedure.query(async () => {
    return await osClient.getPendingTasks();
  }),

  // Validations
  getValidationStats: protectedProcedure.query(async () => {
    return await osClient.getValidationStats();
  }),

  getFailedValidations: protectedProcedure.query(async () => {
    return await osClient.getFailedValidations();
  }),

  // Health
  checkHealth: publicProcedure.query(async () => {
    return await osClient.checkOSHealth();
  }),
});
