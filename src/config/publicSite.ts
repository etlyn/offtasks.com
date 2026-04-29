const readPublicEnv = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
};

export const SITE_URL = readPublicEnv(
  import.meta.env.VITE_PUBLIC_SITE_URL,
  "https://offtasks.com",
);

export const IOS_APP_STORE_URL = readPublicEnv(
  import.meta.env.VITE_IOS_APP_STORE_URL,
  "https://apps.apple.com/search?term=Offtasks",
);

export const PRIVACY_URL = `${SITE_URL}/privacy`;
export const SUPPORT_URL = `${SITE_URL}/support`;
