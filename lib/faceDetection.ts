export type FaceFocalPoint = { x: number; y: number; detected: boolean };

type DetectedFace = {
  boundingBox: { x: number; y: number; width: number; height: number };
};

type FaceDetectorInstance = {
  detect: (source: ImageBitmapSource) => Promise<DetectedFace[]>;
};

type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean;
  maxDetectedFaces?: number;
}) => FaceDetectorInstance;

const FALLBACK: FaceFocalPoint = { x: 0.5, y: 0.42, detected: false };

export async function detectFaceFocalPoint(imageSrc: string): Promise<FaceFocalPoint> {
  if (typeof window === "undefined") return FALLBACK;
  const Detector = (window as typeof window & { FaceDetector?: FaceDetectorConstructor }).FaceDetector;
  if (!Detector) return FALLBACK;

  try {
    const image = await loadImage(imageSrc);
    const faces = await new Detector({ fastMode: true, maxDetectedFaces: 5 }).detect(image);
    const face = faces.sort(
      (a, b) =>
        b.boundingBox.width * b.boundingBox.height -
        a.boundingBox.width * a.boundingBox.height
    )[0];
    if (!face) return FALLBACK;

    return {
      x: Math.min(1, Math.max(0, (face.boundingBox.x + face.boundingBox.width / 2) / image.naturalWidth)),
      y: Math.min(1, Math.max(0, (face.boundingBox.y + face.boundingBox.height / 2) / image.naturalHeight)),
      detected: true,
    };
  } catch {
    return FALLBACK;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
