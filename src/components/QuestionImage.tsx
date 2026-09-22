import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { getQuestionImageUrl } from '@/lib/questionImages';

interface QuestionImageProps {
  path: string | null | undefined;
  previewUrl?: string | null;
  alt?: string;
  className?: string;
}

export const QuestionImage = ({ path, previewUrl, alt = 'รูปประกอบคำถาม', className = '' }: QuestionImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const imagePath = previewUrl || path;

  useEffect(() => {
    setHasError(false);
    setSignedUrl(null);

    if (!imagePath) return;

    // data:, blob: และ http(s) ใช้ได้ตรงๆ อยู่แล้ว ไม่ต้องขอ signed URL
    if (imagePath.startsWith('data:') || imagePath.startsWith('blob:') || imagePath.startsWith('http')) {
      setSignedUrl(imagePath);
      return;
    }

    // path ที่เก็บใน storage bucket (private) ต้องขอ signed URL ก่อนถึงจะเปิดดูได้
    let cancelled = false;
    getQuestionImageUrl(imagePath)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch((err) => {
        console.error('Error creating signed URL for question image:', err);
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  if (!imagePath) return null;

  if (hasError) {
    return <div className={`flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground ${className}`}>
      <ImageOff className="h-4 w-4 shrink-0" /><span>ไม่สามารถแสดงรูปภาพประกอบได้</span>
    </div>;
  }

  if (!signedUrl) {
    return <div className={`flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground ${className}`}>
      <span>กำลังโหลดรูปภาพ...</span>
    </div>;
  }

  return <div className={`overflow-hidden rounded-md border bg-background/50 ${className}`}>
    <img src={signedUrl} alt={alt} onError={() => setHasError(true)} className="max-h-60 w-auto rounded-md object-contain" loading="lazy" />
  </div>;
};

export default QuestionImage;
