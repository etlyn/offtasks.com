import { supabaseClient } from "./supabase";
import { createChatGPTConnection } from "./chatgptConnection";

export const chatGPTConnection = createChatGPTConnection({
  status: async (signal) =>
    await supabaseClient.rpc("offtask_chatgpt_status").abortSignal(signal),
  revoke: async (owner, revision, requestKey, signal) =>
    await supabaseClient
      .rpc("offtask_chatgpt_revoke", {
        expected_owner: owner,
        expected_revision: revision,
        request_key: requestKey,
      })
      .abortSignal(signal),
});
