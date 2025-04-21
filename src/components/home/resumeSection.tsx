import React from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileUp, Sparkles, Download, Save } from "lucide-react";

const ResumeSection = () => {
  return (
    <section id="resume" className="py-20 bg-gray-50">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center space-y-3 mb-8">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            AI Resume Optimizer
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed">
            Upload your resume and get AI-powered suggestions to stand out from the crowd.
          </p>
        </div>

        <Tabs defaultValue="upload" className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="upload">Upload Resume</TabsTrigger>
            <TabsTrigger value="preview">Preview & Optimize</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center space-y-4 py-8 border-2 border-dashed rounded-lg">
                  <div className="rounded-full bg-brand-50 p-3">
                    <FileUp className="h-6 w-6 text-brand-600" />
                  </div>
                  <div className="space-y-2 text-center">
                    <h3 className="font-medium">Upload your resume</h3>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to upload (PDF, DOCX)
                    </p>
                  </div>
                  <div className="w-full max-w-sm">
                    <Button className="w-full">Choose File</Button>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <p className="font-medium">Or paste your resume content:</p>
                  <Textarea placeholder="Paste your resume content here..." className="min-h-[200px]" />
                  <div className="flex justify-end">
                    <Button>Continue</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-5 gap-6">
                  <div className="col-span-3 border rounded-lg p-4 min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-lg">Resume Preview</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" /> Download
                        </Button>
                        <Button size="sm">
                          <Save className="h-4 w-4 mr-2" /> Save
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="text-xl font-bold">John Doe</div>
                      <div className="text-sm text-gray-500">
                        Frontend Developer | New York, NY | john.doe@example.com | (123) 456-7890
                      </div>
                      
                      <div>
                        <div className="font-medium border-b pb-1 mb-2">Professional Summary</div>
                        <p className="text-sm">
                          Passionate frontend developer with 5+ years of experience building 
                          responsive web applications using React and TypeScript. Specialized in 
                          creating user-friendly interfaces and optimizing application performance.
                        </p>
                      </div>
                      
                      <div>
                        <div className="font-medium border-b pb-1 mb-2">Experience</div>
                        <div className="mb-3">
                          <div className="flex justify-between">
                            <div className="font-medium text-sm">Senior Frontend Developer</div>
                            <div className="text-xs text-gray-500">Jan 2020 - Present</div>
                          </div>
                          <div className="text-xs mb-1">TechCorp Inc., New York, NY</div>
                          <ul className="text-xs list-disc list-inside space-y-1">
                            <li>Led the development of a customer portal that increased user engagement by 35%</li>
                            <li>Implemented CI/CD pipeline that reduced deployment time by 40%</li>
                            <li>Mentored junior developers and conducted code reviews</li>
                          </ul>
                        </div>
                      </div>
                      
                      <div>
                        <div className="font-medium border-b pb-1 mb-2">Skills</div>
                        <div className="flex flex-wrap gap-1 text-xs">
                          <span className="bg-gray-100 px-2 py-1 rounded">React</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">TypeScript</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">JavaScript</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">HTML/CSS</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">Redux</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">Jest</span>
                          <span className="bg-brand-100 text-brand-700 px-2 py-1 rounded animate-pulse-subtle">+Add: Next.js</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2 flex flex-col gap-4">
                    <div className="bg-brand-50 border border-brand-100 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="h-5 w-5 text-brand-600" />
                        <h3 className="font-medium">AI Suggestions</h3>
                      </div>
                      <ul className="space-y-3 text-sm">
                        <li className="p-2 border-l-2 border-brand-400 bg-white">
                          <p className="font-medium">Add quantifiable achievements</p>
                          <p className="text-gray-600">Include metrics in your experience section to demonstrate impact.</p>
                        </li>
                        <li className="p-2 border-l-2 border-brand-400 bg-white">
                          <p className="font-medium">Add Next.js to your skills</p>
                          <p className="text-gray-600">This keyword appears in 70% of jobs you might be interested in.</p>
                        </li>
                        <li className="p-2 border-l-2 border-teal-400 bg-white">
                          <p className="font-medium">Try our Professional template <span className="pro-badge">PRO</span></p>
                          <p className="text-gray-600">Upgrade to access 5 premium templates optimized for ATS systems.</p>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="bg-gray-100 border rounded-lg p-4">
                      <h3 className="font-medium mb-3">Template Gallery</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <div className="border bg-white aspect-[3/4] rounded overflow-hidden p-2 shadow-sm">
                            <div className="h-full border-l-4 border-brand-600 pl-1"></div>
                          </div>
                          <p className="text-xs text-center mt-1">Basic</p>
                        </div>
                        <div className="relative">
                          <div className="border bg-white aspect-[3/4] rounded overflow-hidden p-2 shadow-sm opacity-50">
                            <div className="h-full border-t-4 border-teal-600"></div>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded">
                            <span className="text-xs text-white font-medium">PRO</span>
                          </div>
                          <p className="text-xs text-center mt-1">Professional</p>
                        </div>
                        <div className="col-span-2">
                          <Button variant="outline" size="sm" className="w-full mt-2">
                            <span className="mr-1">View all templates</span>
                            <span className="pro-badge text-[10px]">PRO</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  )
}

export default ResumeSection