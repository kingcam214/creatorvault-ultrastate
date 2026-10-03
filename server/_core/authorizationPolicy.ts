import { TRPCError } from "@trpc/server";

export function isOwnerRole(role: string | null | undefined): boolean {
  return role === "king" || role === "admin";
}

/** Administrative delegation does not grant the stricter king-only authority. */
export function assertRoleAssignment(
  actorRole: string,
  requestedRole: string
): void {
  if (
    !isOwnerRole(actorRole) ||
    (requestedRole === "king" && actorRole !== "king")
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient role authority",
    });
  }
}
