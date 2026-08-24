"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VideoPlayerProps {
  videoUrl: string
  title: string
  description?: string | null
  lessonUid?: string
}

export function VideoPlayer({ videoUrl, title, description, lessonUid }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const lastSentRef = useRef<number>(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateProgress = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }

    video.addEventListener("timeupdate", updateProgress)
    return () => video.removeEventListener("timeupdate", updateProgress)
  }, [])

  // Отправка прогресса просмотра (раз в ~10 сек)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !lessonUid) return

    const handler = async () => {
      const current = Math.floor(video.currentTime || 0)
      if (current - lastSentRef.current < 10) return
      lastSentRef.current = current

      fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonUid, watchedSeconds: current }),
      }).catch(() => {})
    }

    video.addEventListener("timeupdate", handler)
    return () => video.removeEventListener("timeupdate", handler)
  }, [lessonUid])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !isMuted
    setIsMuted(!isMuted)
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative w-full bg-black rounded-lg overflow-hidden aspect-video group shadow-xl">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            if (!lessonUid) return
            fetch("/api/progress", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lessonUid, completed: true }),
            }).catch(() => {})
          }}
          onLoadedMetadata={() => {
            const video = videoRef.current
            if (video) {
              video.muted = isMuted
            }
          }}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="icon"
                onClick={togglePlay}
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-all hover:scale-110"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-xs">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleMute}
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-xs transition-all hover:scale-110"
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold">{title}</h3>
        {description && (
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  )
}
