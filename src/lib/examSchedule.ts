export interface ExamScheduleFields {
  start_at?: string | null;
  end_at?: string | null;
  is_locked?: boolean | null;
  is_active?: boolean | null;
}

export type ExamAvailabilityStatus =
  | 'available'
  | 'inactive'
  | 'locked'
  | 'not_started'
  | 'ended';

export interface ExamAvailability {
  status: ExamAvailabilityStatus;
  canStart: boolean;
  message: string;
}

/** แปลงค่า ISO -> ค่าที่ใช้กับ <input type="datetime-local"> (เวลาท้องถิ่น) */
export const toLocalInputValue = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** แปลงค่าจาก <input type="datetime-local"> -> ISO string */
export const fromLocalInputValue = (value: string) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export const formatThaiDateTime = (iso?: string | null) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const formatScheduleRange = (exam: ExamScheduleFields) => {
  if (!exam.start_at && !exam.end_at) return 'ไม่กำหนดช่วงเวลา (สอบได้ตลอด)';
  if (exam.start_at && exam.end_at)
    return `${formatThaiDateTime(exam.start_at)} - ${formatThaiDateTime(exam.end_at)}`;
  if (exam.start_at) return `เปิดสอบ ${formatThaiDateTime(exam.start_at)} เป็นต้นไป`;
  return `ปิดรับ ${formatThaiDateTime(exam.end_at)}`;
};

export const getExamAvailability = (
  exam: ExamScheduleFields,
  now: Date = new Date()
): ExamAvailability => {
  if (exam.is_active === false) {
    return { status: 'inactive', canStart: false, message: 'ปิดใช้งาน' };
  }
  if (exam.is_locked) {
    return {
      status: 'locked',
      canStart: false,
      message: 'ล็อกอยู่ รอผู้ดูแลระบบปลดล็อก',
    };
  }
  if (exam.start_at && now < new Date(exam.start_at)) {
    return {
      status: 'not_started',
      canStart: false,
      message: `ยังไม่ถึงเวลาสอบ (เริ่ม ${formatThaiDateTime(exam.start_at)})`,
    };
  }
  if (exam.end_at && now > new Date(exam.end_at)) {
    return {
      status: 'ended',
      canStart: false,
      message: `หมดเวลาสอบแล้ว (${formatThaiDateTime(exam.end_at)})`,
    };
  }
  return { status: 'available', canStart: true, message: 'พร้อมสอบ' };
};
