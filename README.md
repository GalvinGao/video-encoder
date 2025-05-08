# Video Encoder

A simple web-based video encoder built with React, Mantine UI, and FFmpeg.

## Features

- Beautiful and modern UI using Mantine components
- Two encoding presets:
  - Square SD (480x480, 1Mbps)
  - Square HD (720x720, 1.5Mbps)
- Drag and drop file upload
- Progress tracking during encoding
- Automatic download of encoded videos

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Open your browser and navigate to the URL shown in the terminal.

## Usage

1. Click the "Select video" button to choose a video file
2. Select your desired encoding preset
3. Click "Encode Video" to start the encoding process
4. Wait for the encoding to complete
5. The encoded video will automatically download when ready

## Technical Details

- Uses @ffmpeg/ffmpeg for video encoding
- Maintains aspect ratio while scaling to square dimensions
- Pads video with black bars if needed
- Uses H.264 video codec and AAC audio codec
- Encodes with "medium" preset for good quality/speed balance

## Dependencies

- React
- @mantine/core and related packages
- @ffmpeg/ffmpeg
- @ffmpeg/util
