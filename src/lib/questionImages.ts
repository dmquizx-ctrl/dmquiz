import { supabase } from '@/integrations/supabase/client';

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านรูปภาพได้'));
    reader.readAsDataURL(file);
  });

export const uploadQuestionImage = async (dataUrl: string, previousPath?: string | null) => {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) throw new Error('ข้อมูลรูปภาพไม่ถูกต้อง รองรับเฉพาะ JPG, PNG และ WebP เท่านั้น');

  const mime = match[1];
  const byteChars = atob(match[2]);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }

  if (bytes.byteLength === 0 || bytes.byteLength > 5_000_000) {
    throw new Error('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5 MB');
  }

  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('question-images')
    .upload(filePath, bytes, {
      contentType: mime,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message || 'ไม่สามารถอัปโหลดรูปภาพได้');

  if (previousPath && !previousPath.startsWith('data:') && !previousPath.startsWith('http')) {
    const { error: removeError } = await supabase.storage.from('question-images').remove([previousPath]);
    if (removeError) console.error('Could not remove previous image:', removeError.message);
  }

  return filePath;
};

export const getQuestionImageUrl = async (path: string) => {
  const { data, error } = await supabase.storage.from('question-images').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
};

export const cropPageImage = async (
  dataUrl: string,
  crop: { x: number; y: number; width: number; height: number },
) => {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const x = Math.max(0, Math.min(1000, crop.x));
  const y = Math.max(0, Math.min(1000, crop.y));
  const width = Math.max(1, Math.min(1000 - x, crop.width));
  const height = Math.max(1, Math.min(1000 - y, crop.height));
  const sx = Math.round((x / 1000) * image.naturalWidth);
  const sy = Math.round((y / 1000) * image.naturalHeight);
  const sw = Math.round((width / 1000) * image.naturalWidth);
  const sh = Math.round((height / 1000) * image.naturalHeight);
  const canvas = document.createElement('canvas');
  const maxWidth = 1200;
  const scale = Math.min(1, maxWidth / sw);
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('ไม่สามารถตัดรูปจากเอกสารได้');
  context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
};
