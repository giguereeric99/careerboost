'use client'

import React, { useState } from 'react'
import { useUser } from "@clerk/clerk-react";
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset
} from "@/components/ui/sidebar";
import { FileText, Briefcase, Video, Plus, Trash2 } from "lucide-react";
import ResumeOptimizer from "@/components/dashboard/resumeOptimizer";
import JobSearch from "@/components/dashboard/jobSearch";
import InterviewSimulator from "@/components/dashboard/interviewSimulator";
import { Button } from "@/components/ui/button";

const Page = () => {
  const { user } = useUser();
  const [activeSection, setActiveSection] = useState<'resume' | 'jobs' | 'interview'>('resume');

  const menuItems = [
    {
      title: "Resume Optimizer",
      icon: FileText,
      section: 'resume' as const
    },
    {
      title: "Job Search",
      icon: Briefcase,
      section: 'jobs' as const
    },
    {
      title: "Interview Simulator",
      icon: Video,
      section: 'interview' as const
    }
  ];
  return (
    <section id="dashboard" className="min-h-screen">
      
      <div className="min-h-screen flex flex-col">
        <div className="flex-1">
          <SidebarProvider>
            <div className="min-h-[calc(100vh-64px)] flex w-full bg-gray-50">
              <Sidebar className="pt-16">
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarGroupLabel className="font-bold">Dashboard</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {menuItems.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              onClick={() => setActiveSection(item.section)}
                              isActive={activeSection === item.section}
                              tooltip={item.title}
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </SidebarContent>
              </Sidebar>

              <SidebarInset>
                <div className="w-full">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}!</h1>
                        <p className="text-gray-600">Here's what's happening with your job search journey.</p>
                      </div>
                    </div>

                    {activeSection === 'resume' && <ResumeOptimizer />}
                    {activeSection === 'jobs' && <JobSearch />}
                    {activeSection === 'interview' && <InterviewSimulator />}
                  </div>
                </div>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </div>
      </div>
    </section>
  )
}

export default Page;