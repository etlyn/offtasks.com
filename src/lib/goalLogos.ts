import { supabaseClient } from "./supabase";

type GoalLogoMime = "image/jpeg" | "image/png";
export interface GoalLogo {
  mime_type: GoalLogoMime;
  image_base64: string;
}

const MAX_UPLOAD_BYTES = 128 * 1024;

export const goalLogoSource = (logo: GoalLogo) =>
  `data:${logo.mime_type};base64,${logo.image_base64}`;

async function logoRequest<Result>(
  request: (signal: AbortSignal) => PromiseLike<Result>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export async function listGoalLogos(ids: string[]): Promise<Record<string, GoalLogo>> {
  if (!ids.length) return {};
  const { data, error } = await logoRequest((signal) =>
    supabaseClient
      .from("offtask_goal_logos")
      .select("goal_id,mime_type,image_base64")
      .in("goal_id", ids)
      .abortSignal(signal),
  );
  if (error) throw new Error(error.message);
  const logos: Record<string, GoalLogo> = {};
  for (const row of data) {
    if (row.mime_type === "image/png" || row.mime_type === "image/jpeg") {
      logos[row.goal_id] = {
        mime_type: row.mime_type,
        image_base64: row.image_base64,
      };
    }
  }
  return logos;
}

export async function setGoalLogo(goalId: string, logo: GoalLogo | null) {
  const { error } = await logoRequest((signal) =>
    supabaseClient
      .rpc("offtask_set_goal_logo", {
        goal_id: goalId,
        mime_type: logo?.mime_type ?? null,
        image_base64: logo?.image_base64 ?? null,
      })
      .abortSignal(signal),
  );
  if (error) throw new Error(error.message);
}

export async function prepareGoalLogo(file: File): Promise<GoalLogo> {
  const mime = file.type;
  if (mime !== "image/png" && mime !== "image/jpeg")
    throw new Error("Choose a PNG or JPEG image.");
  if (!file.size || file.size > 12 * 1024 * 1024)
    throw new Error("Choose a non-empty image under 12 MB.");

  // Decode and draw a small copy to remove metadata, preserve the aspect ratio,
  // and keep the uploaded file comfortably within the shared database limit.
  const image = await createImageBitmap(file).catch(() => {
    throw new Error("This image could not be opened. Choose another PNG or JPEG.");
  });
  const canvas = document.createElement("canvas");
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable.");
    for (const maxDimension of [256, 128]) {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL(mime, 0.85);
      const prefix = `data:${mime};base64,`;
      if (!url.startsWith(prefix)) continue;
      const imageBase64 = url.slice(prefix.length);
      const padding = imageBase64.endsWith("==") ? 2 : imageBase64.endsWith("=") ? 1 : 0;
      if (imageBase64.length * 3 / 4 - padding <= MAX_UPLOAD_BYTES)
        return { mime_type: mime, image_base64: imageBase64 };
    }
    throw new Error("This image is too large. Choose a smaller image.");
  } finally {
    image.close();
  }
}
