'use client'

import React, { JSX } from 'react'
import { Button } from '../ui/button'
import { Input } from "@/components/ui/input"

interface UploadFormInputProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

function UploadFormInput({ onSubmit }: UploadFormInputProps): JSX.Element {
  return (
    <div>
      <form onSubmit={onSubmit} className="flex flex-col gap-6 mt-12">
        <div className="flex justify-end items-center gap-1.5">
          <Input id="file" name="file" className="" type="file" accept="application/pdf" required />

          <Button className="bg-linear-to-r from-slate-900 to-brand-500 hover:from-brand-500 hover:to-slate-900 hover:text-white text-white transition duration-300 hover:no-underline">Upload your PDF</Button>
        </div>
      </form>
    </div>
  )
}

export default UploadFormInput