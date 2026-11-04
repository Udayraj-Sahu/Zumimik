import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.zuzumik.app",
  appName: "Zuzumik",
  webDir: "out",
  ...(process.env.CAPACITOR_SERVER_URL
    ? { server: { url: process.env.CAPACITOR_SERVER_URL, cleartext: true } }
    : {}),
};

export default config;
