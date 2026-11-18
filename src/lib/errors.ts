/** An error whose message is safe and useful to show to the person who caused it. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export type ActionState = { ok?: string; error?: string; data?: Record<string, unknown> } | null;
