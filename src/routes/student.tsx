import { createFileRoute } from "@tanstack/react-router";
import StudentDashboard from "@/pages/StudentDashboard";

export const Route = createFileRoute("/student")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "หน้านักเรียน | ระบบสอบออนไลน์" },
      { name: "description", content: "เลือกชุดข้อสอบที่เปิดให้สอบและดูผลคะแนนของคุณ" },
      { property: "og:title", content: "หน้านักเรียน | ระบบสอบออนไลน์" },
      {
        property: "og:description",
        content: "เลือกชุดข้อสอบที่เปิดให้สอบและดูผลคะแนนของคุณ",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentDashboard,
});
