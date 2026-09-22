import { createFileRoute } from "@tanstack/react-router";
import Login from "@/pages/Login";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ | ระบบสอบออนไลน์ โรงเรียนบ้านดอนมูล" },
      {
        name: "description",
        content: "เข้าสู่ระบบสอบออนไลน์สำหรับนักเรียน ครู และผู้ดูแลระบบ",
      },
      { property: "og:title", content: "เข้าสู่ระบบ | ระบบสอบออนไลน์" },
      {
        property: "og:description",
        content: "เข้าสู่ระบบสอบออนไลน์สำหรับนักเรียน ครู และผู้ดูแลระบบ",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});
