import { supabaseClient } from "./supabase";
import { createGoalIntegration } from "./goalWorkbench";

export const goalIntegration = createGoalIntegration(
  async (mode, operation, args) => {
    // Identity is derived by the database from the current session, never from UI input.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const { data, error } = await supabaseClient
        .rpc(`offtask_integration_${mode}`, { operation, args })
        .abortSignal(controller.signal);
      if (error) throw new Error(error.message);
      if (!data || typeof data !== "object")
        throw new Error("Invalid goal response");
      return data;
    } finally {
      clearTimeout(timeout);
    }
  },
);
