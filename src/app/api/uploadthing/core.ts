/**
 * UploadThing Core - VERSION MINIMAL POUR DIAGNOSTIC
 *
 * Cette version ultra-simple aide à identifier si le problème
 * est dans la configuration ou ailleurs.
 */

import { createUploadthing, type FileRouter } from "uploadthing/server";

const f = createUploadthing();

export const OurFileRouter = {
	resumeUploader: f({
		"application/pdf": { maxFileSize: "4MB" },
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
			maxFileSize: "4MB",
		},
		"text/plain": { maxFileSize: "2MB" },
	})
		.middleware(async () => {
			console.log("🔥 MIDDLEWARE CALLED - UploadThing is working!");
			return { test: "middleware-ok" };
		})
		.onUploadComplete(async ({ file }) => {
			console.log("🎉 ON_UPLOAD_COMPLETE CALLED!");
			console.log("📄 File details:", file);

			// Return data with console log to trace
			const returnData = {
				success: true,
				fileName: file.name,
				fileUrl: file.ufsUrl,
				timestamp: Date.now(),
			};

			console.log("📤 RETURNING TO CLIENT:", returnData);

			return returnData;
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof OurFileRouter;
