import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ระบบสอบออนไลน์ โรงเรียนบ้านดอนมูล" },
      {
        name: "description",
        content: "ระบบสอบออนไลน์สำหรับนักเรียน ครู และผู้ดูแลระบบ โรงเรียนบ้านดอนมูล",
      },
      { property: "og:title", content: "ระบบสอบออนไลน์ โรงเรียนบ้านดอนมูล" },
      {
        property: "og:description",
        content: "ระบบสอบออนไลน์สำหรับนักเรียน ครู และผู้ดูแลระบบ โรงเรียนบ้านดอนมูล",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});
