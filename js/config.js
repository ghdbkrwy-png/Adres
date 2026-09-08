window.APP_CONFIG = {
  APP_NAME: "ادرس معي",
  APP_TAGLINE: "يقرأ مصادرك ويشرحها لك — حتى بصوت بودكاست",
  SUPABASE_URL: "https://fjezmpzxqkeywbdgtofu.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZXptcHp4cWtleXdiZGd0b2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQxNzIsImV4cCI6MjEwNDQ1MDE3Mn0.AgrMDWI3T36y-bzd-mWE4YHyCdNCukH0eEEuYxIxqQ8",
  REPOSITORY_BASE: "/Adris/"
};

window.SUPABASE_FUNCTION = function(name) {
  return `${APP_CONFIG.SUPABASE_URL}/functions/v1/${name}`;
};
