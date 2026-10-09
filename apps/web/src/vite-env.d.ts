/** Build-time environment variables for the Digital Mazdoor web app. */
interface ImportMetaEnv {
  /**
   * Public origin of the Digital Mazdoor API for production builds, e.g.
   * "https://api.yourdomain.com". Unset = same-origin (dev uses the Vite
   * proxy in vite.config.ts, which forwards /api/* to 127.0.0.1:3001).
   */
  readonly VITE_API_URL?: string;
}
