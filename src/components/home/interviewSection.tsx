import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Video, Mic, MessageSquare } from "lucide-react";

const InterviewSection = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center space-y-3 mb-12">
          <Badge className="mb-2 bg-brand-100 text-brand-700 hover:bg-brand-200">PRO Feature</Badge>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Perfect Your Interview Skills
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed">
            Practice with our AI interviewer and receive personalized feedback.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl rounded-xl overflow-hidden border">
          <div className="absolute inset-0 backdrop-blur-sm bg-white/30 flex flex-col items-center justify-center z-10">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md mx-auto">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center">
                <Lock className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Pro Feature Locked</h3>
              <p className="text-gray-500 mb-4">Upgrade to Pro to practice interviews with our AI simulator and receive personalized feedback.</p>
              <Button>Upgrade to Pro</Button>
            </div>
          </div>

          <div className=" bg-white flex flex-col lg:flex-row">
            <div className="p-6">
              <div className="bg-gray-900 aspect-video rounded-lg shadow-lg flex flex-col items-center justify-center text-white mb-6">
                <Video className="h-12 w-12 mb-2" />
                <p className="text-lg font-medium">AI Interviewer</p>
                <p className="text-sm text-gray-400">Your virtual interview session</p>
              </div>
              
              <div className="flex justify-center gap-4 mb-6">
                <Button variant="outline" size="lg" className="gap-2">
                  <Mic className="h-5 w-5" /> Unmute
                </Button>
                <Button size="lg" className="gap-2">
                  <Video className="h-5 w-5" /> Start Interview
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="bg-brand-100 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-brand-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 text-sm flex-1">
                    <p className="font-medium mb-1">AI Interviewer</p>
                    <p>Tell me about a challenging project you worked on and how you overcame obstacles during its development.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="bg-teal-100 h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="font-medium text-teal-700">You</div>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-3 text-sm flex-1">
                    <p>In my previous role, I led the development of a complex e-commerce platform that needed to handle thousands of concurrent users...</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-l p-4 bg-gray-50 space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Interview Settings</CardTitle>
                  <CardDescription>Customize your practice session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Job Role</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option>Frontend Developer</option>
                      <option>Backend Developer</option>
                      <option>Full Stack Developer</option>
                      <option>UX/UI Designer</option>
                      <option>Product Manager</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">Experience Level</label>
                    <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option>Junior (0-2 years)</option>
                      <option>Mid-level (2-5 years)</option>
                      <option>Senior (5+ years)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium block mb-1">Interview Type</label>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input type="radio" id="behavioral" name="interviewType" />
                        <label htmlFor="behavioral" className="text-sm">Behavioral</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="radio" id="technical" name="interviewType" />
                        <label htmlFor="technical" className="text-sm">Technical</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="radio" id="mixed" name="interviewType" />
                        <label htmlFor="mixed" className="text-sm">Mixed</label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Real-time Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Communication</span>
                        <span className="text-sm text-gray-500">8/10</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200">
                        <div className="h-2 rounded-full bg-teal-500" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Technical Accuracy</span>
                        <span className="text-sm text-gray-500">7/10</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200">
                        <div className="h-2 rounded-full bg-teal-500" style={{ width: '70%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Problem Solving</span>
                        <span className="text-sm text-gray-500">9/10</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200">
                        <div className="h-2 rounded-full bg-teal-500" style={{ width: '90%' }}></div>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <h4 className="text-sm font-medium mb-1">Improvement Tips:</h4>
                      <ul className="text-xs space-y-1 text-gray-600">
                        <li>• Try to include more specific examples in your answers</li>
                        <li>• Speak more confidently about your technical skills</li>
                        <li>• Great job with your problem-solving approach!</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default InterviewSection