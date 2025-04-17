'use client'

import React from 'react'
import UploadFormInput from './uploadFormInput'
import { z } from 'zod'
import { useUploadThing } from '../../utils/uploadthing';
import { toast } from "sonner"
import { ClientUploadedFileData } from 'uploadthing/types';
import { generatePdfSummary } from '@/actions/uploadActions';



//schema with zod
const schema = z.object({
  file: z.instanceof(File, { message: 'Invalid file' })
  .refine((file) => file.type.startsWith('application/pdf'),
    'File must be a PDF',
  )
  .refine((file) => file.size <= 20 * 1024 * 1024,
    'File size must be less than 20MB',
  )
});

const UploadForm = () => {
  const { startUpload, routeConfig } = useUploadThing('pdfUploader', {
    onClientUploadComplete: (res) => {
      console.log('Files: ', res)
      console.log('Upload Completed!')
    },
    onUploadError: (error: Error) => {
      console.error(`ERROR! ${error.message}`)
      toast("Error occurred while uploaded", {
        description: error.message,
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;

    //validating the fields
    const validatedFields = schema.safeParse({ file });

    console.log(validatedFields);

    if (!validatedFields.success) {
      console.error(
        validatedFields.error.flatten()
        .fieldErrors.file?.[0] ?? 'Invalid file',
      );
      toast.error("Something went wrong", {
        description: validatedFields.error.flatten()
        .fieldErrors.file?.[0] ?? 'Invalid file'
      })
      return;
    }

    toast.message("Uploading PDF...", {
      description: "Please wait while we upload your file.",
    });

    //upload the file to uploadthing
    const resp = await startUpload([file]);
    if (!resp) {
      toast.error("Something went wrong", {
        description: "Please use a different file",
      })
      return;
    }

    toast.message("Processing PDF", {
      description: "Hang tight! Our AI is working on it.",
    });

    //Parse the PDF using langchain
    const mappedResp = resp.map(file => ({
      serverData: {
        userId: file.customId || 'unknown',
        file: {
          url: file.ufsUrl,
          name: file.name,
        },
      },
    }));
    const summary = await generatePdfSummary([mappedResp[0]]);
    console.log("summary", summary);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      <UploadFormInput onSubmit={handleSubmit} />
    </div>
  )
}

export default UploadForm