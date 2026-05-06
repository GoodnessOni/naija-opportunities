import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return new NextResponse("Missing url", { status: 400 })

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NaijaOpportunities/1.0)",
        "Referer": url,
      },
    })
    if (!response.ok) return new NextResponse("Failed", { status: response.status })
    const contentType = response.headers.get("content-type") || "image/jpeg"
    const buffer = await response.arrayBuffer()
    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
    })
  } catch {
    return new NextResponse("Error", { status: 500 })
  }
}
