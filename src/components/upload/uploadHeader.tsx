import React from 'react'
import { Sparkles } from 'lucide-react'
import { Badge } from "@/components/ui/badge"

const UploadHeader = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center">
      <div className="relative p-[1px] overflow-hidden rounded-full bg-linear-to-r from-blue-200 via-blue-500 to-blue-800 animate-gradient-x group">
        <Badge variant={'secondary'} className="bg-white relative px-6 py-2 text-base text-white hover:text-blue-500 font-medium bg-transparent rounded-full transition-colors duration-200 group-hover:bg-gray-50">
          <Sparkles className="h-6 w-6 mr-2 text-purple-600 animate-pulse" />
          <span>AI-Powered Content Creation</span>
        </Badge>
      </div>
      <div className="capitalize text-3xl sm:text-4xl font-bold text-gray-900">
        Start Uploading{''}
        <span className="relative inline-block">
          <span className="relative z-10 px-2">Your PDF's</span>
          <span className="absolute inset-0 bg-purple-200/50 -rotate-2 rounded-lg transform -skew-y-1" aria-hidden="true"></span>
        </span>{' '}
        <div className="mt-8 text-lg leading-0 text-gray-600 max-w-2xl">Upload your PDF and let our AI do the magic! </div>
      </div>
    </div>
  )
}

export default UploadHeader