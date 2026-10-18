# 3D Ninja Academy: Shadow Jutsu Simulator 🥷🌀

An immersive, playable 3D anime ninja training game inspired by Naruto, featuring live webcam computer vision and real-time hand gesture recognition powered by Python, OpenCV, MediaPipe, and Three.js.

---

## 🌟 Core Concept

The application displays **YOUR ACTUAL LIVE WEBCAM FOOTAGE ON THE BIG SCREEN** with **REAL-TIME NEURAL LIVE SKELETON TRACKING**:

- **Actual Webcam Footage in Big Screen**: Direct high-speed 30 FPS video feed of your physical face and body filling the entire screen.
- **Real-Time Live Skeleton Tracking**: Glowing neon cyan & green finger bones, joint nodes, palm chakra reticle, and bounding boxes drawn directly on top of your hands in real time.
- **Real Video Shadow Clones of YOU**: When you raise your hand for **Shadow Clone Jutsu**, 3 time-delayed video clones of **YOURSELF** spawn flanking you in clouds of billowing smoke ("POOF!"), following your movements with delayed playback!
- **Ultimate Shadow Army**: Spawns 10+ video clones of yourself filling the screen!
- **AR Hand Jutsu**:
  - **Rasengan**: Swirling blue energy ball in your tracked palm, launched forward when you thrust!
  - **Chidori**: Crackling blue electric lightning jumping across your fingers!
  - **Fireball**: Volumetric fire erupting from your hands!
  - **Substitution Jutsu**: You vanish and a wooden training log replaces you in smoke!
  - **Chakra Shield**: Hexagonal protective energy barrier over your palm!

---

## 🥋 Ultra-Easy Hand Signs (Simple Finger Counting!)

No complicated seals or stiff poses required! Just count your fingers or make natural hand shapes:

| Hand Sign / Shape | Jutsu Activated | Visual & Audio Effect | Keyboard |
|:---|:---|:---|:---:|
| ✋ **5 Fingers (Any Open Hand)** | **Shadow Clone Jutsu (Kage Bunshin)** | Spawns 3 time-delayed video clones of YOU in clouds of billowing smoke! | `[1]` |
| ✌️ **2 Fingers (Peace / V-Sign)** | **Chidori (One Thousand Birds)** | Electric blue lightning crackles and jumps along your fingertips with chirping sound! | `[2]` |
| ☝️ **1 Finger (Point Up)** | **Fireball Jutsu (Katon: Gokakyu)** | Great roaring flame fireball launches from your fingertip toward the screen! | `[3]` |
| ✊ **0 Fingers (Closed Fist)** | **Rasengan** | Swirling blue chakra sphere charges inside your fist with vortex rings! | `[4]` |
| 👍 **Thumbs Up** | **Substitution Jutsu (Kawarimi)** | Instant smoke explosion; you vanish and a wooden training log takes your place! | `[5]` |
| 🙌 **Both Hands Up** | **Ultimate Shadow Army (Taju Kage Bunshin)** | Massive smoke barrage; 10+ shadow clones fill the entire screen! | `[0]` |
| 👎 **Thumb Down OR 👌 3 Fingers** | **Disperse / Delete Shadow Clones** | Instantly deletes and removes all active shadow clones in puffs of smoke! | `[C]` |

---


## 🚀 Quick Start Guide

### Option 1: One-Click Start (Recommended on Windows)
Simply double-click `start_game.bat`!
This will automatically launch the Shadow Jutsu Camera server and open the web application at `http://localhost:8080`.

### Option 2: Manual Start
1. **Install dependencies** (if not already installed):
   ```bash
   pip install -r requirements.txt
   ```
2. **Start the Shadow Jutsu Camera Server**:
   ```bash
   python camera_server.py
   ```
3. **Open the Web App**:
   Navigate to `http://localhost:8080` in Google Chrome or Microsoft Edge.

---

## 🛡️ Accessibility & Safety
- **Photo-Sensitivity Mode**: Located in the in-game Settings panel (`⚙️`). Replaces the blinding white flashbang with a comfortable dark indigo vignette.
- **Flash Intensity Slider**: Allows adjusting flash opacity from 10% to 100%.
- **Synthesized Audio**: All audio is procedurally generated through the Web Audio API with zero external media files, zero loading delay, and master volume control.
