import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/pages/AdminDashboard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ผู้ดูแลระบบ | ระบบสอบออนไลน์" },
      { name: "description", content: "จัดการข้อสอบ ครู รายวิชา นักเรียน และผลคะแนน" },
      { property: "og:title", content: "ผู้ดูแลระบบ | ระบบสอบออนไลน์" },
      {
        property: "og:description",
        content: "จัดการข้อสอบ ครู รายวิชา นักเรียน และผลคะแนน",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});
