"use client"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LiveAttendanceTab } from "@/components/live-attendance-tab"
import { RegisterStudentTab } from "@/components/register-student-tab"
import { StudentsListTab } from "@/components/students-list-tab"

export default function AttendanceDashboard() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold text-foreground">
            Face Recognition Attendance
          </h1>
          <Badge className="bg-[#22c55e] text-white hover:bg-[#22c55e]/90">
            <span className="mr-1.5 h-2 w-2 rounded-full bg-white animate-pulse" />
            System Active
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="mb-6 w-full justify-start bg-card border border-border">
            <TabsTrigger value="live" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white">
              Live Attendance
            </TabsTrigger>
            <TabsTrigger value="register" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white">
              Register Student
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-[#3b82f6] data-[state=active]:text-white">
              Students List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <LiveAttendanceTab />
          </TabsContent>

          <TabsContent value="register">
            <RegisterStudentTab />
          </TabsContent>

          <TabsContent value="students">
            <StudentsListTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
