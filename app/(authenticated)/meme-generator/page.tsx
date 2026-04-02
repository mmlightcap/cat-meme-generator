"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Cat, Download, RefreshCw, Sparkles } from "lucide-react"
import { useCallback, useRef, useState } from "react"

export default function MemeGeneratorPage() {
  const [topText, setTopText] = useState("")
  const [bottomText, setBottomText] = useState("")
  const [fontSize, setFontSize] = useState(48)
  const [catUrl, setCatUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [catLoaded, setCatLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const fetchCat = useCallback(async () => {
    setLoading(true)
    setCatLoaded(false)
    // Use cataas.com for random cat images — the timestamp busts the cache
    const url = `https://cataas.com/cat?timestamp=${Date.now()}`
    setCatUrl(url)

    // Pre-load the image
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imageRef.current = img
      setCatLoaded(true)
      setLoading(false)
    }
    img.onerror = () => {
      // Fallback: try a different service
      const fallback = `https://placecats.com/${600}/${400}?t=${Date.now()}`
      const fallbackImg = new Image()
      fallbackImg.crossOrigin = "anonymous"
      fallbackImg.onload = () => {
        imageRef.current = fallbackImg
        setCatUrl(fallback)
        setCatLoaded(true)
        setLoading(false)
      }
      fallbackImg.onerror = () => setLoading(false)
      fallbackImg.src = fallback
    }
    img.src = url
  }, [])

  const drawMeme = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    // Draw the cat image
    ctx.drawImage(img, 0, 0)

    // Configure meme text style
    const size = fontSize * (canvas.width / 600) // scale relative to a 600px base
    ctx.font = `900 ${size}px Impact, Arial Black, sans-serif`
    ctx.textAlign = "center"
    ctx.fillStyle = "white"
    ctx.strokeStyle = "black"
    ctx.lineWidth = size / 12
    ctx.lineJoin = "round"

    // Draw top text
    if (topText) {
      const x = canvas.width / 2
      const y = size + 10
      ctx.strokeText(topText.toUpperCase(), x, y)
      ctx.fillText(topText.toUpperCase(), x, y)
    }

    // Draw bottom text
    if (bottomText) {
      const x = canvas.width / 2
      const y = canvas.height - 20
      ctx.strokeText(bottomText.toUpperCase(), x, y)
      ctx.fillText(bottomText.toUpperCase(), x, y)
    }
  }, [topText, bottomText, fontSize])

  // Redraw whenever text/font changes and image is loaded
  const handleDraw = useCallback(() => {
    if (catLoaded) drawMeme()
  }, [catLoaded, drawMeme])

  // Trigger a redraw whenever inputs change
  // We use a simple approach: draw after state update via useEffect-like pattern
  // But since we want it on every render when catLoaded, we call it directly
  if (catLoaded && canvasRef.current) {
    // Schedule draw on next microtask to ensure canvas ref is attached
    queueMicrotask(drawMeme)
  }

  const downloadMeme = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement("a")
    link.download = "cat-meme.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight flex items-center justify-center gap-3">
          <Cat className="h-10 w-10" />
          Cat Meme Generator
          <Sparkles className="h-8 w-8 text-yellow-500" />
        </h1>
        <p className="mt-2 text-muted-foreground">
          Generate random cat images and add your own meme text!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Customize Your Meme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="top-text">Top Text</Label>
              <Input
                id="top-text"
                placeholder="e.g., WHEN YOU REALIZE..."
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bottom-text">Bottom Text</Label>
              <Input
                id="bottom-text"
                placeholder="e.g., IT'S ALREADY MONDAY"
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Font Size: {fontSize}px</Label>
              <Slider
                value={[fontSize]}
                onValueChange={(val) => setFontSize(val[0])}
                min={24}
                max={80}
                step={2}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={fetchCat} disabled={loading} className="flex-1">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Loading..." : catUrl ? "New Cat" : "Get a Cat!"}
              </Button>

              {catLoaded && (
                <Button onClick={downloadMeme} variant="outline" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {!catUrl && !loading && (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
                <Cat className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  Click &quot;Get a Cat!&quot; to start
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 text-center">
                <RefreshCw className="mb-4 h-12 w-12 animate-spin text-muted-foreground/50" />
                <p className="text-muted-foreground">Finding a cat...</p>
              </div>
            )}

            <canvas
              ref={canvasRef}
              className={`w-full rounded-lg ${catLoaded ? "" : "hidden"}`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        Cat images provided by cataas.com
      </div>
    </div>
  )
}
