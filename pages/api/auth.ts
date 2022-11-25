import { supabaseClient } from "../../backend";

export default function handler(req, res) {
  supabaseClient.auth.api.setAuthCookie(req, res);
}
