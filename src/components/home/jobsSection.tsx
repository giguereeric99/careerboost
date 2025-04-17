import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, MapPin, Briefcase, Clock, ArrowUpRight } from "lucide-react";

const JobsSection = () => {
  return (
    <section className="py-20">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="text-center space-y-3 mb-12">
          <Badge className="mb-2 bg-brand-100 text-brand-700 hover:bg-brand-200">PRO Feature</Badge>
          <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Find Your Dream Job
          </h2>
          <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed">
            Access real-time job listings with advanced filters and personalized matches.
          </p>
        </div>

        <div className="relative mx-auto max-w-5xl rounded-xl overflow-hidden border">
          <div className="absolute inset-0 backdrop-blur-sm bg-white/30 flex flex-col items-center justify-center z-10">
            <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md mx-auto">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center">
                <Lock className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Pro Feature Locked</h3>
              <p className="text-gray-500 mb-4">Upgrade to Pro to access our powerful job search engine with real-time listings and advanced filters.</p>
              <Button>Upgrade to Pro</Button>
            </div>
          </div>

          <div className=" bg-white flex flex-col lg:flex-row">
            <div className="border-r p-4 bg-gray-50">
              <div className="mb-6">
                <h3 className="font-medium mb-2">Search</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Job title, skills, or company" 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <Button size="sm">Search</Button>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2">Location</h3>
                <input 
                  type="text" 
                  placeholder="City, state, or country" 
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-2"
                />
                <div className="flex items-center gap-2 text-sm">
                  <input type="checkbox" id="remote" />
                  <label htmlFor="remote">Remote only</label>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2">Job Type</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="fulltime" />
                    <label htmlFor="fulltime">Full-time</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="parttime" />
                    <label htmlFor="parttime">Part-time</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="contract" />
                    <label htmlFor="contract">Contract</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="internship" />
                    <label htmlFor="internship">Internship</label>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2">Experience Level</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="entry" />
                    <label htmlFor="entry">Entry Level</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="mid" />
                    <label htmlFor="mid">Mid Level</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="senior" />
                    <label htmlFor="senior">Senior Level</label>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Salary Range</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Min" 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <span className="flex items-center">-</span>
                  <input 
                    type="text" 
                    placeholder="Max" 
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b">
                <div>
                  <h3 className="font-medium">105 results found</h3>
                  <p className="text-sm text-gray-500">Showing jobs matching your profile</p>
                </div>
                <div>
                  <select className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option>Most relevant</option>
                    <option>Newest first</option>
                    <option>Highest salary</option>
                  </select>
                </div>
              </div>

              {[1, 2, 3].map((job) => (
                <Card key={job} className="card-hover">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between">
                      <div>
                        <CardTitle>Senior Frontend Developer</CardTitle>
                        <CardDescription>Tech Company Inc.</CardDescription>
                      </div>
                      <Badge className={job === 1 ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' : ''}>
                        {job === 1 ? '94% Match' : job === 2 ? '86% Match' : '78% Match'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-y-2 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center mr-4">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span>{job === 1 ? 'Remote' : job === 2 ? 'New York, NY' : 'San Francisco, CA'}</span>
                      </div>
                      <div className="flex items-center mr-4">
                        <Briefcase className="h-3.5 w-3.5 mr-1" />
                        <span>Full-time</span>
                      </div>
                      <div className="flex items-center mr-4">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        <span>Posted {job === 1 ? 'today' : job === 2 ? '2 days ago' : '1 week ago'}</span>
                      </div>
                    </div>
                    <p className="text-sm mb-3">
                      {job === 1 ? 
                        'We are looking for an experienced Frontend Developer to join our team and help build amazing user experiences with React and TypeScript...' : 
                        'Join our growing team to work on cutting-edge web applications...'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">React</Badge>
                      <Badge variant="secondary">TypeScript</Badge>
                      <Badge variant="secondary">{job === 1 ? 'Next.js' : job === 2 ? 'Redux' : 'Vue.js'}</Badge>
                      <Badge variant="secondary">{job === 1 ? 'CSS-in-JS' : job === 2 ? 'GraphQL' : 'Webpack'}</Badge>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <div className="text-sm font-medium">
                        ${job === 1 ? '120K' : job === 2 ? '110K' : '100K'} - ${job === 1 ? '150K' : job === 2 ? '130K' : '120K'}
                      </div>
                      <Button variant="outline" size="sm" className="gap-1">
                        View Job <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default JobsSection