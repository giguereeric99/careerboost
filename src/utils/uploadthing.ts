import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

type OurFileRouter = typeof OurFileRouter;

// ✅ Helpers (useUploadThing)
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();

// ✅ Upload button component
export const UploadButton = generateUploadButton<OurFileRouter>();

// ✅ Dropzone component (optionnel)
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();