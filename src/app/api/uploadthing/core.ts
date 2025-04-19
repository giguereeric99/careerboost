import { createUploadthing, type FileRouter } from "uploadthing/server";
import { utapi } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  resumeUploader: f({
    pdf: { maxFileSize: "4MB" },
    docx: { maxFileSize: "4MB" },
    txt: { maxFileSize: "2MB" },
  })
    .middleware(async () => {
      // Auth ici si besoin (ex: utilisateur connecté)
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log("File uploaded :", file);
    }),
} satisfies FileRouter;

