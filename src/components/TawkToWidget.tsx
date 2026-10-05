import { useEffect } from "react";

export function TawkToWidget() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const w = window as unknown as Record<string, unknown>;
    if (w["Tawk_API"]) return;

    w["Tawk_API"] = {} as Record<string, unknown>;
    w["Tawk_LoadStart"] = new Date();

    const s1 = document.createElement("script");
    s1.async = true;
    s1.src = "https://embed.tawk.to/6abab04d634b26345631c91c/default";
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");

    const s0 = document.getElementsByTagName("script")[0];
    s0?.parentNode?.insertBefore(s1, s0);
  }, []);

  return null;
}
