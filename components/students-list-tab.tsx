"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, UserPlus, CheckCircle } from "lucide-react"

const API_BASE = "https://face-attendance-system-dgj7.onrender.com"

interface Student {
  name: string
  photos: number
}

export function StudentsListTab() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [retrainingStudent, setRetrainingStudent] = useState<string | null>(null)
  const [retrainedStudent, setRetrainedStudent] = useState<string | null>(null)

  const fetchStudents = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      const response = await fetch(`${API_BASE}/students`)
      if (response.ok) {
        const data = await response.json()
        // API returns { students: [...], total: N }
        setStudents(Array.isArray(data) ? data : data.students ?? [])
      }
    } catch (err) {
      console.log("Failed to fetch students:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  const handleRetrain = useCallback(async (studentName: string) => {
    setRetrainingStudent(studentName)
    setRetrainedStudent(null)
    try {
      const response = await fetch(`${API_BASE}/register/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: studentName }),
      })
      if (response.ok) {
        setRetrainedStudent(studentName)
        setTimeout(() => setRetrainedStudent(null), 3000)
      }
    } catch (err) {
      console.log("Retrain failed:", err)
    } finally {
      setRetrainingStudent(null)
    }
  }, [])

  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-foreground">Registered Students</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Total: {students.length} student{students.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchStudents(true)}
          disabled={isRefreshing}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No students registered yet</p>
            <p className="text-sm text-muted-foreground">
              Go to the Register tab to add students
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Name</TableHead>
                <TableHead>Photos</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.name} className="border-border">
                  <TableCell>
                    <Badge className="bg-[#3b82f6] text-white">
                      {student.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {student.photos} photo{student.photos !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    {retrainedStudent === student.name ? (
                      <div className="inline-flex items-center gap-1 text-[#22c55e]">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Done</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetrain(student.name)}
                        disabled={retrainingStudent === student.name}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {retrainingStudent === student.name ? "Retraining..." : "Retrain"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}