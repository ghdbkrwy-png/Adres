window.APP_CONFIG = {
  APP_NAME: "ادرس معي",
  APP_TAGLINE: "يقرأ مصادرك ويشرحها لك — حتى بصوت بودكاست",
  SUPABASE_URL: "https://fjezmpzxqkeywbdgtofu.supabase.co",
  SUPABASE_ANON_KEY: "",
  REPOSITORY_BASE: "/Adris/"
};

window.SUPABASE_FUNCTION = function(name) {
  return `${APP_CONFIG.SUPABASE_URL}/functions/v1/${name}`;
};
