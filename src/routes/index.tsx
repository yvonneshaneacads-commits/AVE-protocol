import { createFileRoute } from "@tanstack/react-router";
import { AveApp } from "@/components/ave/AveApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AVE · Think first, verify after" },
      { name: "description", content: "Six phases, six AI personas, with a prompt bank for research, presentations, writing and decisions." },
      { property: "og:title", content: "AVE · Think first, verify after" },
      { property: "og:description", content: "Six phases, six AI personas, with a prompt bank for research, presentations, writing and decisions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AveApp,
});
