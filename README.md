<p align="center">
  <img src="assets/banner.png" alt="NINJA-ACADEMY Banner" width="100%">
</p>

# ◈ 3D Ninja : Jutsu

[![CI](https://github.com/ISBANDURAHUMAN-R/NINJA-ACADEMY/actions/workflows/ci.yml/badge.svg)](https://github.com/ISBANDURAHUMAN-R/NINJA-ACADEMY/actions/workflows/ci.yml)

## ◆ About the Project
3D Ninja : Jutsu is a computer vision web game that brings gesture-controlled training mechanics to life using real-time hand tracking and procedural rendering. By analyzing webcam video input through MediaPipe and OpenCV, the application translates physical finger counts into visual elemental effects and procedural audio.

## ❖ Key Features
- Real-time hand pose and skeletal tracking using Google MediaPipe and OpenCV.
- Finger counting gesture classifier mapping hand signs to specific actions (Rasengan, Chidori, Fireball, Substitution, and Shadow Clones).
- Time-delayed video cloning system that spawns multiple video feeds of the player.
- Three.js 3D overlay rendering visual particle spheres and shield meshes on tracked coordinates.
- Procedural audio synthesizer built with the Web Audio API for zero-latency sound effects.

## ◆ System Architecture
```mermaid
graph TD
    subgraph VisionPipeline ["&nbsp; OpenCV &amp; MediaPipe Backend &nbsp;"]
        Cam["&nbsp; Webcam Video &nbsp;<br/>&nbsp; Capture &nbsp;"] --> CV["&nbsp; OpenCV Frame &nbsp;<br/>&nbsp; Preprocessing &nbsp;"]
        CV --> MP["&nbsp; MediaPipe Hands &nbsp;<br/>&nbsp; (21 3D Landmarks) &nbsp;"]
        MP --> GestureDetect["&nbsp; Gesture &amp; &nbsp;<br/>&nbsp; Finger Classifier &nbsp;"]
        GestureDetect --> WSServer["&nbsp; WebSockets Server &nbsp;<br/>&nbsp; (Port 8765) &nbsp;"]
    end

    subgraph BrowserClient ["&nbsp; Frontend Browser Engine &nbsp;"]
        WSClient["&nbsp; WebSocket Client &nbsp;<br/>&nbsp; Receiver &nbsp;"] --> StateBus["&nbsp; Jutsu Event &nbsp;<br/>&nbsp; Dispatcher &nbsp;"]
        StateBus --> JutsuState{"&nbsp; Jutsu? &nbsp;"}
        JutsuState -- 1 Finger --> Rasengan["&nbsp; Rasengan Swirling &nbsp;<br/>&nbsp; Energy Sphere &nbsp;"]
        JutsuState -- 2 Fingers --> Chidori["&nbsp; Chidori Lightning &nbsp;<br/>&nbsp; Particle Arc &nbsp;"]
        JutsuState -- 3 Fingers --> Fireball["&nbsp; Katon Fireball &nbsp;<br/>&nbsp; Shader Effect &nbsp;"]
        JutsuState -- 4 Fingers --> Clone["&nbsp; Shadow Clone &nbsp;<br/>&nbsp; Delay Buffer &nbsp;"]
        JutsuState -- 5 Fingers --> Barrier["&nbsp; Chakra Shield &nbsp;<br/>&nbsp; Barrier &nbsp;"]
    end

    subgraph GraphicsAudio ["&nbsp; Real-time Renderers &nbsp;"]
        Rasengan --> ThreeMesh["&nbsp; Three.js Mesh &nbsp;<br/>&nbsp; &amp; Particle Layer &nbsp;"]
        Chidori --> ThreeMesh
        Fireball --> ThreeMesh
        Barrier --> ThreeMesh
        Clone --> CanvasMulti["&nbsp; HTML5 Multi-Stream &nbsp;<br/>&nbsp; Video Grid &nbsp;"]
        StateBus --> AudioSynth["&nbsp; Web Audio API &nbsp;<br/>&nbsp; Procedural Synth &nbsp;"]
    end

    WSServer --> WSClient
```

## ⬢ Technologies Used
- Python 3.9+
- OpenCV
- MediaPipe
- Three.js
- HTML5 Canvas & Web Audio API

## § Requirements
- Python 3.9 or higher
- Connected webcam
- Modern web browser

## ▲ Installation & Execution
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Launch Camera Server
python camera_server.py

# 3. Open Web Interface
# Navigate to http://localhost:8080 in Google Chrome or Microsoft Edge
```

## ※ Developer
Developer: ISBANDU RAHUMAN R  
GitHub: https://github.com/ISBANDURAHUMAN-R
