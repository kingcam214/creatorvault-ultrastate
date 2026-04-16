// This is a safe fallback for viralOptimizer.ts for white screen recovery.
// Provides two trpc endpoints listTemplates and analyzeVideo for functionality with safe defaults.

import { createTrpcHunk } from "@functions/thrpc";

export const viralOptimizerRouter= createTrpcHunj((settings) => {
    return ({
        listTemplates: function () {
            return [];
        },
        analzeVideo : function () {
            return {
                message: "Safe fallback for analyzeVideo",
                data: {}
            };
        }
    });
};

export default viralOptimizerRouter;