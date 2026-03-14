import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Culture Logbook",
    short_name: "Logbook",
    description: "Track the books, films, shows, podcasts and events you consume.",
    start_url: "/",
    display: "standalone",
    background_color: "#F2EDE3",
    theme_color: "#6B1A26",
    icons: [
      {
        src: "/IMG_2437.jpeg",
        sizes: "any",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
