# Logo Setup Instructions for BC Data Loader

## Current Status

A temporary placeholder icon has been created at:
```
Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png
```

## How to Use Your AGIC Logo

### Step 1: Prepare Your Logo Image

1. Locate your AGIC logo file (the one you mentioned in the conversation)
2. Recommended specifications:
   - **Format**: PNG with transparent background (preferred) or JPG
   - **Size**: 128x128 pixels (standard for Fabric icons)
   - **Aspect ratio**: Square (1:1)

### Step 2: Replace the Placeholder Icon

Replace the following files with your AGIC logo:

1. **BC Data Loader Item Icon** (Required):
   ```
   Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png
   ```
   This appears in the Fabric UI when users create or view BC Data Loader items.

2. **Workload Icon** (Optional - affects overall workload branding):
   ```
   Workload\Manifest\assets\images\Workload_Icon.png
   ```
   This appears in the Fabric workload hub and main navigation.

### Step 3: Using PowerShell to Resize (if needed)

If your logo needs to be resized to 128x128 pixels, you can use this PowerShell script:

```powershell
# Install required module (one-time)
# Install-Module -Name ImageResize -Force

# Resize image to 128x128
$sourcePath = "C:\path\to\your\agic-logo.png"
$destinationPath = "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads\Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png"

# Simple copy if already correct size
Copy-Item -Path $sourcePath -Destination $destinationPath -Force
```

Or use an online tool like:
- https://www.iloveimg.com/resize-image
- https://imageresizer.com/

### Step 4: Verify the Icon

After replacing the file, rebuild the manifest:

```powershell
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads"
.\scripts\Build\BuildManifest.ps1
```

### Step 5: Deploy and Test

1. Deploy the workload:
   ```powershell
   .\scripts\Deploy\DeployWorkload.ps1
   ```

2. In Microsoft Fabric, check that your AGIC logo appears:
   - In the "Create New Item" dialog
   - In the workspace item list
   - In the BC Data Loader item editor

## Icon Usage in the Workload

Your logo will appear in these locations:

1. **Fabric Workspace**: When users browse items in their workspace
2. **Create Dialog**: When users create a new BC Data Loader item
3. **Item List**: In the left navigation when viewing workload items
4. **Hub Cards**: In the workload hub promotional cards (if configured)

## Manifest References

The icon is referenced in these manifest files:

- `Workload\Manifest\items\BCDataLoaderItem\BCDataLoaderItem.json`:
  ```json
  "icon": {
    "name": "assets/images/BCDataLoaderItem_Icon.png"
  },
  "activeIcon": {
    "name": "assets/images/BCDataLoaderItem_Icon.png"
  }
  ```

## Troubleshooting

**Issue**: Icon doesn't appear after deployment
- **Solution**: Clear browser cache and refresh Fabric
- **Solution**: Verify file exists at exact path: `Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png`
- **Solution**: Check file is valid PNG format and not corrupted

**Issue**: Icon appears pixelated or blurry
- **Solution**: Ensure source image is at least 128x128 pixels
- **Solution**: Use PNG format with transparent background for best quality

**Issue**: Build fails with icon error
- **Solution**: Verify filename matches exactly (case-sensitive): `BCDataLoaderItem_Icon.png`
- **Solution**: Ensure file is in correct directory: `Workload\Manifest\assets\images\`

## Quick Copy Command

If your AGIC logo is ready at a specific path, use this command to copy it:

```powershell
# Replace SOURCE_PATH with your logo location
$sourceLogo = "C:\path\to\your\agic-logo.png"
$targetPath = "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads\Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png"

Copy-Item -Path $sourceLogo -Destination $targetPath -Force

Write-Host "✓ Logo copied successfully!" -ForegroundColor Green
Write-Host "Next step: Run .\scripts\Build\BuildManifest.ps1" -ForegroundColor Yellow
```
