Add-Type -AssemblyName System.Drawing

function Resize-Image($srcPath, $dstPath, $w, $h, $pad) {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $dest = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $drawW = $w - ($pad * 2)
    $drawH = $h - ($pad * 2)
    $g.DrawImage($src, $pad, $pad, $drawW, $drawH)
    $dest.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
    Write-Host "Created $dstPath ($w x $h)"
}

$source = (Resolve-Path "frontend/public/blgflogo.jpg").Path
Resize-Image $source "frontend/public/icon-192.png" 192 192 0
Resize-Image $source "frontend/public/icon-512.png" 512 512 0
Resize-Image $source "frontend/public/icon-maskable-512.png" 512 512 40
Resize-Image $source "frontend/public/apple-touch-icon.png" 180 180 0
