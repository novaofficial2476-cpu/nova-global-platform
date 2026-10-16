import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "NOVA — One World. Your World.",
    short_name: "NOVA",
    description: "Your stories, communities, videos, and conversations in one place.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "any",
    background_color: "#f5f7fb",
    theme_color: "#0b1020",
    categories: ["social", "video", "communication"],
    icons: [
      { src: "/nova-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/nova-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
