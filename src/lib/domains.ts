export const PUBLIC_HOST = "agendelle.com.br";
export const PUBLIC_SITE_URL = "https://agendelle.com.br";
export const APP_SITE_URL = "https://app.agendelle.com.br";
export const APP_HOST = "app.agendelle.com.br";

export function isAppHost(): boolean {
  return typeof window !== "undefined" && window.location.hostname === APP_HOST;
}
