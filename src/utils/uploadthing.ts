import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import type { ourFileRouter } from "@/app/api/uploadthing/core";

// ✅ Helpers (useUploadThing)
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();

// ✅ Upload button component
export const UploadButton = generateUploadButton<OurFileRouter>();

// ✅ Dropzone component (optionnel)
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();