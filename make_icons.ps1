Add-Type -AssemblyName System.Drawing

function Make-Icon([int]$size, [string]$filename) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $color1 = [System.Drawing.Color]::FromArgb(0, 132, 255)
    $color2 = [System.Drawing.Color]::FromArgb(114, 9, 183)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $color1, $color2, 45.0
    $g.FillEllipse($brush, 1, 1, ($size - 2), ($size - 2))

    $penColor = [System.Drawing.Color]::White
    $penWidth = [Math]::Max(1.5, [float]($size / 14))
    $pen = New-Object System.Drawing.Pen $penColor, $penWidth
    $w = [int]($size * 0.55)
    $h = [int]($size * 0.45)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2 - ($size * 0.05))
    $g.DrawEllipse($pen, $x, $y, $w, $h)

    # Dot in center representing AI
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $dotSize = [Math]::Max(2, [int]($size * 0.12))
    $dx = [int](($size - $dotSize) / 2)
    $dy = [int]($y + ($h - $dotSize) / 2)
    $g.FillEllipse($dotBrush, $dx, $dy, $dotSize, $dotSize)

    $fullPath = Join-Path $PSScriptRoot $filename
    $bmp.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Make-Icon 16 'extension\icons\icon16.png'
Make-Icon 48 'extension\icons\icon48.png'
Make-Icon 128 'extension\icons\icon128.png'
Write-Host "Icons generated successfully"
