import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers
} from "@uploadthing/react";

import type { OurFileRouter } from "../app/api/uploadthing/core";
// import type { FileRouter } from "../api/uploadthing/core";

export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
// export const UploadButton = generateUploadButton<OurFileRouter>();
// export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
