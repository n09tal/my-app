import { env } from "../env";

export const setCookie = (name: string, value: string, days: number = 1) => {
  if (typeof window === "undefined") return;

  if (!value || value === "undefined" || value === "null") {
    console.error("[Cookie] ❌ Cannot set cookie - invalid value:", value);
    return;
  }

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  const isSecure = env.isProduction || window.location.protocol === "https:";
  const secureFlag = isSecure ? ";Secure" : "";

  const cookieString = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax${secureFlag}`;
  document.cookie = cookieString;
};

export const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;

  const nameEQ = `${name}=`;
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1, cookie.length);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length, cookie.length);
    }
  }

  return null;
};

export const deleteCookie = (name: string) => {
  if (typeof window === "undefined") return;

  const isSecure = env.isProduction || window.location.protocol === "https:";
  const secureFlag = isSecure ? ";Secure" : "";

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;SameSite=Strict${secureFlag}`;
};
