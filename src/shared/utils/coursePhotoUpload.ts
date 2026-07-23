import {createSlug} from './slug';

const COURSE_PHOTO_WIDTH = 1200;
const COURSE_PHOTO_HEIGHT = 780;
const COURSE_PHOTO_QUALITY = 0.84;

type CoursePhotoUploadResponse = {
  url?: string;
  error?: string;
};

export async function createCoursePhotoUrl(file: File, courseName: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  canvas.width = COURSE_PHOTO_WIDTH;
  canvas.height = COURSE_PHOTO_HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Course photo could not be processed.');
  }

  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = COURSE_PHOTO_WIDTH / COURSE_PHOTO_HEIGHT;
  const sourceWidth = sourceRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
  const sourceHeight = sourceRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    COURSE_PHOTO_WIDTH,
    COURSE_PHOTO_HEIGHT,
  );

  const photoBlob = await canvasToBlob(canvas);
  const photoFile = new File([photoBlob], `${createSlug(courseName) || 'course-photo'}.webp`, {
    type: 'image/webp',
  });
  const formData = new FormData();
  formData.set('file', photoFile);
  formData.set('courseName', courseName);

  const response = await fetch('/api/course-photos', {
    method: 'POST',
    body: formData,
  });
  const result = await response.json() as CoursePhotoUploadResponse;

  if (!response.ok || !result.url) {
    throw new Error(result.error ?? 'Course photo could not be uploaded.');
  }

  return result.url;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Course photo could not be loaded.'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error('Course photo could not be processed.'));
    }, 'image/webp', COURSE_PHOTO_QUALITY);
  });
}
