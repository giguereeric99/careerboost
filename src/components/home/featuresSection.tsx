import React, { ReactNode } from 'react'
import { CheckIcon, FileText, Search, Video } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Step = {
  title: string
  description: string
  icon: ReactNode
}

const FeaturesSection = () => {


  return (
    <section id="features" className="py-20 bg-gray-50">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
            Supercharge Your Job Search
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed">
            Our AI-powered tools help you stand out in the job market and land your dream role.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="card-hover">
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <FileText className="h-6 w-6 text-brand-600" />
              </div>
              <CardTitle>AI Resume Optimizer</CardTitle>
              <CardDescription>
                Enhance your resume with AI-powered suggestions and formatting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Keyword optimization for ATS systems</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Content suggestions tailored to job descriptions</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>1 template design <Badge variant="outline" className="ml-1">Basic</Badge></span>
                </li>
                <li className="flex items-center text-brand-600">
                  <CheckIcon className="mr-2 h-4 w-4 text-brand-600" />
                  <span>5 premium templates <Badge className="ml-1 bg-gradient-to-r from-brand-600 to-teal-600">Pro</Badge></span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="card-hover relative overflow-hidden">
            <div className="absolute -right-3 -top-3 p-3">
              <Badge className="bg-gradient-to-r from-brand-600 to-teal-600">
                Pro Feature
              </Badge>
            </div>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <Search className="h-6 w-6 text-brand-600" />
              </div>
              <CardTitle>Real-Time Job Search</CardTitle>
              <CardDescription>
                Find the perfect job opportunities with advanced filters and alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Filter by country, city, and region</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Customizable job type preferences</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Real-time notifications for new openings</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Match percentage with your resume</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="card-hover relative overflow-hidden">
            <div className="absolute -right-3 -top-3 p-3">
              <Badge className="bg-gradient-to-r from-brand-600 to-teal-600">
                Pro Feature
              </Badge>
            </div>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
                <Video className="h-6 w-6 text-brand-600" />
              </div>
              <CardTitle>AI Interview Simulator</CardTitle>
              <CardDescription>
                Practice and perfect your interview skills with AI-generated feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Industry-specific interview questions</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Real-time feedback on your answers</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Practice technical and behavioral questions</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="mr-2 h-4 w-4" />
                  <span>Improvement suggestions and tips</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

export default FeaturesSection