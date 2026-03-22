"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { useWebcam } from "@/hooks/use-webcam"
import { Users, UserCheck, TrendingUp, RotateCcw } from "lucide-react"

const API_BASE = "http://localhost:8000"

interface RecognitionResult {
  name: string
  confidence: number
}

interface SessionData {
  total_students: number
  present_today: number
  attendance_rate: number
}

interface AttendanceRecord {
  name: string
  date: string
  time: string
}

export function LiveAttendanceTab() {
  const { videoRef, canvasRef, isStreaming, error, startStream, captureFrame } = useWebcam()
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null)
  const [session, setSession] = useState<SessionData | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isResetting, setIsResetting] = useState(false)

  // Start webcam on mount
  useEffect(() => {
    startStream()
  }, [startStream])

  // Recognition polling - every 2 seconds
  useEffect(() => {
    if (!isStreaming) return

    const recognizeInterval = setInterval(async () => {
      const frame = captureFrame()
      if (!frame) return

      try {
        const response = await fetch(`${API_BASE}/recognize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: frame }),
        })
        if (response.ok) {
          const data = await response.json()
          setRecognition(data)
        }
      } catch (err) {
        console.log("[v0] Recognition request failed:", err)
      }
    }, 2000)

    return () => clearInterval(recognizeInterval)
  }, [isStreaming, captureFrame])

  // Session and attendance polling - every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionRes, attendanceRes] = await Promise.all([
          fetch(`${API_BASE}/session`),
          fetch(`${API_BASE}/attendance`),
        ])

        if (sessionRes.ok) {
          const sessionData = await sessionRes.json()
          setSession(sessionData)
        }

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json()
          setAttendance(attendanceData)
        }
      } catch (err) {
        console.log("[v0] Failed to fetch session/attendance:", err)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleReset = useCallback(async () => {
    setIsResetting(true)
    try {
      await fetch(`${API_BASE}/reset`, { method: "POST" })
      setSession(null)
      setAttendance([])
    } catch (err) {
      console.log("[v0] Reset failed:", err)
    } finally {
      setIsResetting(false)
    }
  }, [])

  const isRecognized = recognition?.name && recognition.name !== "Unknown"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Side - Webcam Feed (60%) */}
      <div className="lg:col-span-3">
        <Card className={`bg-card border-2 transition-colors rounded-xl ${
          recognition 
            ? isRecognized 
              ? "border-[#22c55e]" 
              : "border-[#ef4444]"
            : "border-border"
        }`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Live Camera Feed</CardTitle>
            <Badge className={`${isStreaming ? "bg-[#22c55e]" : "bg-muted"} text-white`}>
              <span className={`mr-1.5 h-2 w-2 rounded-full ${isStreaming ? "bg-white animate-pulse" : "bg-gray-400"}`} />
              {isStreaming ? "Live" : "Offline"}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <p className="text-[#ef4444] text-center px-4">{error}</p>
                </div>
              )}
            </div>

            {/* Detection Status */}
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Detected</p>
                <p className="text-lg font-semibold text-foreground">
                  {recognition?.name || "Waiting..."}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-lg font-semibold text-foreground">
                  {recognition?.confidence ? `${Math.round(recognition.confidence)}%` : "-"}
                </p>
              </div>
              {recognition && (
                <Badge className={isRecognized ? "bg-[#22c55e] text-white" : "bg-[#ef4444] text-white"}>
                  {isRecognized ? "Recognized" : "Unknown"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Session & Records (40%) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Session Summary */}
        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Session Summary</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isResetting}
              className="border-border hover:bg-secondary"
            >
              {isResetting ? <Spinner className="mr-2" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Reset Session
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-[#3b82f6]" />
                <p className="text-2xl font-bold text-foreground">{session?.total_students ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <UserCheck className="h-6 w-6 mx-auto mb-2 text-[#22c55e]" />
                <p className="text-2xl font-bold text-foreground">{session?.present_today ?? 0}</p>
                <p className="text-xs text-muted-foreground">Present Today</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-[#f59e0b]" />
                <p className="text-2xl font-bold text-foreground">
                  {session?.attendance_rate ? `${Math.round(session.attendance_rate)}%` : "0%"}
                </p>
                <p className="text-xs text-muted-foreground">Attendance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="bg-card border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-foreground">Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No records yet
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record, index) => (
                      <TableRow key={index} className="border-border">
                        <TableCell>
                          <Badge className="bg-[#22c55e] text-white">
                            {record.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">{record.date}</TableCell>
                        <TableCell className="text-foreground">{record.time}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
