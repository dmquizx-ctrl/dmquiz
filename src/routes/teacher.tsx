import { createFileRoute } from "@tanstack/react-router";
import TeacherDashboard from "@/pages/TeacherDashboard";

export const Route = createFileRoute("/teacher")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "หน้าครู | ระบบสอบออนไลน์" },
      { name: "description", content: "จัดการคลังข้อสอบ ชุดข้อสอบ และรายงานผลของนักเรียน" },
      { property: "og:title", content: "หน้าครู | ระบบสอบออนไลน์" },
      {
        property: "og:description",
        content: "จัดการคลังข้อสอบ ชุดข้อสอบ และรายงานผลของนักเรียน",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeacherDashboard,
});
