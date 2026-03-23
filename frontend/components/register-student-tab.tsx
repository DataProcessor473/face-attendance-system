"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { useWebcam } from "@/hooks/use-webcam"
import { Camera, Rocket, CheckCircle, XCircle, Lightbulb } from "lucide-react"

const API_BASE = "http://localhost:8000"

interface CapturedPhoto {
  id: number
  thumbnail: string
}

export function RegisterStudentTab() {
  const { videoRef, canvasRef, isStreaming, error, startStream, captureFrame } = useWebcam()
  const [studentName, setStudentName] = useState("")
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [isCapturing, setIsCapturing] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [trainingStatus, setTrainingStatus] = useState<"idle" | "success" | "error">("idle")

  // Start webcam on mount
useEffect(() => {
  fetch(`${API_BASE}/`).catch(() => {})
  startStream()
}, [startStream])

  const handleCapture = useCallback(async () => {
    if (!studentName.trim()) {
      alert("Please enter student name first")
      return
    }

    if (photos.length >= 10) {
      alert("Maximum 10 photos reached")
      return
    }

    setIsCapturing(true)
    const frame = captureFrame()
    
    if (!frame) {
      setIsCapturing(false)
      return
    }

    try {
      const response = await fetch(`${API_BASE}/register/photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: studentName, image: frame }),
      })

      if (response.ok) {
        // Add to local photo list
        const newPhoto: CapturedPhoto = {
          id: Date.now(),
          thumbnail: `data:image/jpeg;base64,${frame}`,
        }
        setPhotos((prev) => [...prev.slice(-4), newPhoto])
      }
    } catch (err) {
      console.log("[v0] Photo capture failed:", err)
    } finally {
      setIsCapturing(false)
    }
  }, [studentName, photos.length, captureFrame])

  const handleTrain = useCallback(async () => {
    setIsTraining(true)
    setTrainingStatus("idle")

    try {
      const response = await fetch(`${API_BASE}/register/train`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: studentName }),
      })

      if (response.ok) {
        setTrainingStatus("success")
        // Reset form after success
        setTimeout(() => {
          setStudentName("")
          setPhotos([])
          setTrainingStatus("idle")
        }, 3000)
      } else {
        setTrainingStatus("error")
      }
    } catch (err) {
      console.log("[v0] Training failed:", err)
      setTrainingStatus("error")
    } finally {
      setIsTraining(false)
    }
  }, [studentName])

  const photoCount = photos.length
  const progress = (photoCount / 10) * 100
  const canTrain = photoCount >= 5 && studentName.trim()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column - Webcam Capture */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground">Capture Photos</CardTitle>
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

          <Button
            onClick={handleCapture}
            disabled={!isStreaming || isCapturing || !studentName.trim() || photos.length >= 10}
            className="w-full bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white"
            size="lg"
          >
            {isCapturing ? (
              <>
                <Spinner className="mr-2" />
                Capturing...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Capture Photo
              </>
            )}
          </Button>

          {/* Photo Thumbnails */}
          <div className="grid grid-cols-5 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="aspect-square rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={photo.thumbnail}
                  alt="Captured"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 5 - photos.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-lg border border-dashed border-border bg-secondary"
              />
            ))}
          </div>

          {/* Photo Counter & Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Photos captured</span>
              <span className="text-foreground font-medium">{photoCount} / 10</span>
            </div>
            <Progress value={progress} className="h-2 bg-secondary [&>div]:bg-[#22c55e]" />
          </div>
        </CardContent>
      </Card>

      {/* Right Column - Student Details */}
      <Card className="bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-foreground">Student Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="student-name" className="text-sm text-muted-foreground">
              Student Name <span className="text-[#ef4444]">*</span>
            </label>
            <Input
              id="student-name"
              placeholder="Enter student name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="p-4 bg-secondary rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-[#3b82f6]">
              <Lightbulb className="h-5 w-5" />
              <span className="font-medium text-foreground">Tips for best results</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Capture at least 10 photos from different angles:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Face the camera directly</li>
              <li>Slightly turn left and right</li>
              <li>Try different lighting if possible</li>
              <li>Keep a neutral expression</li>
            </ul>
          </div>

          <Button
            onClick={handleTrain}
            disabled={!canTrain || isTraining}
            className="w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-white disabled:bg-muted disabled:text-muted-foreground"
            size="lg"
          >
            {isTraining ? (
              <>
                <Spinner className="mr-2" />
                Training model...
              </>
            ) : (
              <>
                <Rocket className="mr-2 h-5 w-5" />
                Train Model
              </>
            )}
          </Button>

          {/* Training Status Messages */}
          {trainingStatus === "success" && (
            <div className="flex items-center gap-2 p-4 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-[#22c55e]" />
              <span className="text-[#22c55e]">Student registered successfully!</span>
            </div>
          )}

          {trainingStatus === "error" && (
            <div className="flex items-center gap-2 p-4 bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg">
              <XCircle className="h-5 w-5 text-[#ef4444]" />
              <span className="text-[#ef4444]">Training failed, please try again</span>
            </div>
          )}

          {!canTrain && photoCount < 5 && studentName.trim() && (
            <p className="text-sm text-muted-foreground text-center">
              Capture at least {5 - photoCount} more photo{5 - photoCount !== 1 ? "s" : ""} to enable training
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
