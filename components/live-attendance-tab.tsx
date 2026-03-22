"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useWebcam } from "@/hooks/use-webcam"
import { Users, UserCheck, RotateCcw } from "lucide-react"

const API_BASE = "https://face-attendance-system-dgj7.onrender.com"

interface RecognitionResult {
  name: string
  confidence: number
  marked: boolean
  session: string[]
  time: string
}

interface AttendanceRecord {
  Name: string
  Date: string
  Time: string
}

export function LiveAttendanceTab() {
  const { videoRef, canvasRef, isStreaming, error, startStream, captureFrame } = useWebcam()
  const [recognition, setRecognition] = useState<RecognitionResult | null>(null)
  const [presentCount, setPresentCount] = useState(0)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [isResetting, setIsResetting] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  // Start webcam on mount
  useEffect(() => {
    startStream()
  }, [startStream])

  // Recognition every 2 seconds
  useEffect(() => {
    if (!isStreaming) return
    const interval = setInterval(async () => {
      const frame = captureFrame()
      if (!frame) return
      setIsScanning(true)
      try {
        const res = await fetch(`${API_BASE}/recognize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: frame }),
        })
        if (res.ok) {
          const data = await res.json()
          setRecognition(data)
        }
      } catch (e) {
        console.log("Recognition error:", e)
      } finally {
        setIsScanning(false)
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [isStreaming, captureFrame])

  // Fetch session + attendance every 5 seconds
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionRes, attendanceRes] = await Promise.all([
          fetch(`${API_BASE}/session`),
          fetch(`${API_BASE}/attendance`),
        ])
        if (sessionRes.ok) {
          const d = await sessionRes.json()
          setPresentCount(d.count ?? 0)
        }
        if (attendanceRes.ok) {
          const d = await attendanceRes.json()
          setAttendance(Array.isArray(d) ? d : d.attendance ?? [])
        }
      } catch (e) {
        console.log("Fetch error:", e)
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
      setPresentCount(0)
      setAttendance([])
      setRecognition(null)
    } catch (e) {
      console.log("Reset error:", e)
    } finally {
      setIsResetting(false)
    }
  }, [])

  const isRecognized = recognition?.name && recognition.name !== "Unknown"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

      {/* Left - Webcam */}
      <div className="lg:col-span-3">
        <Card className={`bg-card border-2 transition-colors rounded-xl ${
          recognition ? isRecognized ? "border-[#22c55e]" : "border-[#ef4444]" : "border-border"
        }`}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live Camera Feed</CardTitle>
            <div className="flex gap-2">
              {isScanning && <Badge className="bg-[#3b82f6] text-white animate-pulse">Scanning...</Badge>}
              <Badge className={`${isStreaming ? "bg-[#22c55e]" : "bg-muted"} text-white`}>
                <span className={`mr-1.5 h-2 w-2 rounded-full ${isStreaming ? "bg-white animate-pulse" : "bg-gray-400"}`} />
                {isStreaming ? "Live" : "Offline"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                  <p className="text-[#ef4444] text-center px-4">{error}</p>
                </div>
              )}
            </div>

            {/* Detection Result */}
            <div className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
              isRecognized ? "bg-[#22c55e]/10 border-[#22c55e]/30" : "bg-secondary border-border"
            }`}>
              <div>
                <p className="text-sm text-muted-foreground">Detected Person</p>
                <p className="text-xl font-bold">{recognition?.name ?? "Scanning..."}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-xl font-bold">
                  {recognition?.confidence ? `${recognition.confidence.toFixed(1)}%` : "-"}
                </p>
              </div>
              {recognition && (
                <Badge className={isRecognized ? "bg-[#22c55e] text-white" : "bg-[#ef4444] text-white"}>
                  {isRecognized ? "✅ Recognized" : "❌ Unknown"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right - Session + Records */}
      <div className="lg:col-span-2 space-y-6">

        {/* Session Summary */}
        <Card className="bg-card border-border rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Session Summary</CardTitle>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={isResetting}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {isResetting ? "Resetting..." : "Reset Session"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-secondary rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-[#3b82f6]" />
                <p className="text-2xl font-bold">{attendance.length}</p>
                <p className="text-xs text-muted-foreground">Total Records</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-lg">
                <UserCheck className="h-6 w-6 mx-auto mb-2 text-[#22c55e]" />
                <p className="text-2xl font-bold">{presentCount}</p>
                <p className="text-xs text-muted-foreground">Present Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="bg-card border-border rounded-xl">
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No attendance records yet.</p>
                <p className="text-sm mt-1">Records appear when students are recognized.</p>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record, index) => (
                      <TableRow key={index} className="border-border">
                        <TableCell>
                          <Badge className="bg-[#22c55e] text-white">
                            {record.Name ?? record.name}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.Date ?? record.date}</TableCell>
                        <TableCell>{record.Time ?? record.time}</TableCell>
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