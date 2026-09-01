import { useEffect } from "react";

export function SmartsuppWidget() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if ((window as unknown as Record<string, unknown>).smartsupp) return;

    const w = window as unknown as Record<string, unknown>;
    w._smartsupp = (w._smartsupp || {}) as Record<string, unknown>;
    (w._smartsupp as Record<string, string>).key = "3c4c7811cdd9c3f66e47a331393748a2c45af244";

    const d = document;
    const s = d.getElementsByTagName("script")[0];
    const c = d.createElement("script");
    c.type = "text/javascript";
    c.charset = "utf-8";
    c.async = true;
    c.src = "https://www.smartsuppchat.com/loader.js?";
    s?.parentNode?.insertBefore(c, s);
  }, []);

  return null;
}
