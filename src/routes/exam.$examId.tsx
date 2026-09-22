import { createFileRoute } from "@tanstack/react-router";
import ExamTaking from "@/pages/ExamTaking";

export const Route = createFileRoute("/exam/$examId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ทำข้อสอบ | ระบบสอบออนไลน์" },
      { name: "description", content: "หน้าทำข้อสอบออนไลน์พร้อมจับเวลาและบันทึกคำตอบอัตโนมัติ" },
      { property: "og:title", content: "ทำข้อสอบ | ระบบสอบออนไลน์" },
      {
        property: "og:description",
        content: "หน้าทำข้อสอบออนไลน์พร้อมจับเวลาและบันทึกคำตอบอัตโนมัติ",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExamTaking,
});
