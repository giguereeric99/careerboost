import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter = {
  resumeUploader: f({
    // Types MIME autorisés
    "application/pdf": { maxFileSize: "4MB" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "4MB" }, // .docx
    "text/plain": { maxFileSize: "2MB" }, // .txt
  })
    .middleware(async () => {
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log("File uploaded :", file);
    }),
} satisfies FileRouter;
