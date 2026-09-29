import AppKit
import CoreGraphics

// Eave as the site draws him (main.js eaveBody + eyePath): a 600 × 470 superellipse body, rounder
// on top and flatter where he sits, and two "^" eyes; plus a cream rim so he shows on dark tabs.
func body() -> [CGPoint] {
    (0..<150).map { i in
        let t = Double(i) / 150 * .pi * 2, c = cos(t), s = sin(t)
        let e = s > 0 ? 4.4 : 2.7
        let pinch = s < 0 ? 1 - 0.07 * s * s : 1
        return CGPoint(x: 300 + 300 * pinch * (c < 0 ? -1 : 1) * pow(abs(c), 2 / e),
                       y: 235 + 235 * (s < 0 ? -1 : 1) * pow(abs(s), 2 / e))
    }
}
let eyeDX = 108.0, eyeY = 250.0, eyeHW = 52.0, eyeH = 48.0
func eye(_ side: Double) -> [CGPoint] {
    let cx = 300 + side * eyeDX
    return [CGPoint(x: cx - eyeHW, y: eyeY + eyeH / 2), CGPoint(x: cx, y: eyeY - eyeH / 2), CGPoint(x: cx + eyeHW, y: eyeY + eyeH / 2)]
}
let navy = "#262B41", eyeColor = "#F4E9D5", rimColor = "#F6E9D1", cream = "#EFE6D6"
let rim = 26.0, eyeStroke = 62.0

// The SVG: a square view box around him and his rim.
let side = 600 + rim * 2 + 12
let top = (side - 470) / 2
func d(_ points: [CGPoint], closed: Bool) -> String {
    points.enumerated().map { "\($0 == 0 ? "M" : "L")\(String(format: "%.1f", $1.x)) \(String(format: "%.1f", $1.y))" }.joined() + (closed ? "Z" : "")
}
let svg = """
<svg xmlns="http://www.w3.org/2000/svg" viewBox="\(-(side - 600) / 2) \(-top) \(side) \(side)">
  <path d="\(d(body(), closed: true))" fill="\(navy)" stroke="\(rimColor)" stroke-width="\(rim * 2)" stroke-linejoin="round" paint-order="stroke"/>
  <path d="\(d(body(), closed: true))" fill="\(navy)"/>
  <g fill="none" stroke="\(eyeColor)" stroke-width="\(eyeStroke)" stroke-linecap="round" stroke-linejoin="round">
    <path d="\(d(eye(-1), closed: false))"/><path d="\(d(eye(1), closed: false))"/>
  </g>
</svg>

"""
// Run from the site folder: DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun swift tools/favicon.swift .
// (then: sips -s format ico favicon-32.png --out favicon.ico && rm favicon-32.png)
let out = URL(fileURLWithPath: CommandLine.arguments[1])
try! svg.write(to: out.appending(path: "favicon.svg"), atomically: true, encoding: .utf8)

func color(_ hex: String) -> CGColor {
    let v = UInt32(hex.dropFirst(), radix: 16)!
    return CGColor(srgbRed: CGFloat(v >> 16 & 255) / 255, green: CGFloat(v >> 8 & 255) / 255, blue: CGFloat(v & 255) / 255, alpha: 1)
}
/// `pixels` square; `background` fills it (nil: transparent); he takes `share` of its width.
func png(_ pixels: Int, background: String?, share: Double) -> Data {
    let ctx = CGContext(data: nil, width: pixels, height: pixels, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let size = Double(pixels)
    if let background { ctx.setFillColor(color(background)); ctx.fill(CGRect(x: 0, y: 0, width: size, height: size)) }
    // His units (y down) into pixels, centered.
    let scale = size * share / (600 + rim * 2)
    ctx.translateBy(x: 0, y: size)
    ctx.scaleBy(x: 1, y: -1)
    ctx.translateBy(x: (size - 600 * scale) / 2, y: (size - 470 * scale) / 2)
    ctx.scaleBy(x: scale, y: scale)
    let path = CGMutablePath()
    path.addLines(between: body())
    path.closeSubpath()
    if background == nil {
        ctx.addPath(path)
        ctx.setStrokeColor(color(rimColor))
        ctx.setLineWidth(rim * 2)
        ctx.setLineJoin(.round)
        ctx.strokePath()
    }
    ctx.addPath(path)
    ctx.setFillColor(color(navy))
    ctx.fillPath()
    ctx.setStrokeColor(color(eyeColor))
    ctx.setLineWidth(eyeStroke)
    ctx.setLineCap(.round)
    ctx.setLineJoin(.round)
    for s in [-1.0, 1.0] {
        let eyePath = CGMutablePath()
        eyePath.addLines(between: eye(s))
        ctx.addPath(eyePath)
    }
    ctx.strokePath()
    return NSBitmapImageRep(cgImage: ctx.makeImage()!).representation(using: .png, properties: [:])!
}
try! png(64, background: nil, share: 1).write(to: out.appending(path: "favicon.png"))
try! png(32, background: nil, share: 1).write(to: out.appending(path: "favicon-32.png"))
try! png(180, background: cream, share: 0.74).write(to: out.appending(path: "apple-touch-icon.png"))
print("done")
