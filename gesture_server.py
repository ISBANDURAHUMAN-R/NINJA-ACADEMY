"""
Ninja Academy: Shadow Jutsu Simulator - Real-Time Vision & Gesture Server
Uses OpenCV + MediaPipe HandLandmarker to capture live webcam feed,
classify 10 ninja jutsu hand seals/gestures with temporal smoothing & cooldowns,
and broadcast events over WebSocket to the Three.js 3D Game Client.
"""

import asyncio
import json
import math
import os
import sys
import time
import urllib.request
import cv2
import numpy as np

try:
    import websockets
except ImportError:
    print("Please install websockets: pip install websockets")
    sys.exit(1)

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task")
WS_PORT = 8765
CAMERA_INDEX = 0

def ensure_model_exists():
    if not os.path.exists(MODEL_PATH):
        print(f"[Vision] Downloading MediaPipe hand landmarker model to {MODEL_PATH}...")
        try:
            urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
            print("[Vision] Model downloaded successfully.")
        except Exception as e:
            print(f"[Vision] Error downloading model: {e}")
            raise

# Landmark indices
WRIST = 0
THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP = 1, 2, 3, 4
INDEX_MCP, INDEX_PIP, INDEX_DIP, INDEX_TIP = 5, 6, 7, 8
MIDDLE_MCP, MIDDLE_PIP, MIDDLE_DIP, MIDDLE_TIP = 9, 10, 11, 12
RING_MCP, RING_PIP, RING_DIP, RING_TIP = 13, 14, 15, 16
PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP = 17, 18, 19, 20

def dist_3d(p1, p2):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

def dist_2d(p1, p2):
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2)

class GestureEngine:
    def __init__(self):
        # Ability Cooldowns (in seconds)
        self.cooldowns = {
            "shadow_clone": 2.5,
            "flashbang": 3.0,
            "explosive": 2.0,
            "rasengan": 4.0,
            "chidori": 4.0,
            "fireball": 3.5,
            "substitution": 5.0,
            "teleport": 2.0,
            "chakra_shield": 1.5,
            "shadow_army": 12.0
        }
        self.last_trigger_time = {k: 0.0 for k in self.cooldowns}
        
        # Temporal tracking state
        self.prev_landmarks = []
        self.prev_time = time.time()
        self.wrist_velocities = []
        
        # Fist state for explosive jutsu sequence
        self.fist_detected_time = 0.0
        
        # Rasengan charge accumulation
        self.rasengan_charge = 0.0
        self.last_rasengan_check = time.time()
        
        # Candidate gesture stability
        self.candidate_gesture = None
        self.candidate_start_time = 0.0
        self.candidate_confidence = 0.0
        
        # Minimum hold durations before triggering (seconds)
        self.hold_thresholds = {
            "shadow_clone": 0.35,
            "flashbang": 0.25,
            "explosive": 0.1,  # triggers immediately on fist->open
            "rasengan": 0.6,   # charging circular swirl
            "chidori": 0.3,
            "fireball": 0.4,
            "substitution": 0.3,
            "teleport": 0.15,
            "chakra_shield": 0.35,
            "shadow_army": 1.2
        }

    def is_finger_extended(self, lm, tip_idx, pip_idx, mcp_idx):
        wrist = lm[WRIST]
        d_tip = dist_3d(wrist, lm[tip_idx])
        d_pip = dist_3d(wrist, lm[pip_idx])
        d_mcp = dist_3d(wrist, lm[mcp_idx])
        return d_tip > d_pip * 1.15 and d_tip > d_mcp * 1.3

    def is_thumb_extended(self, lm):
        wrist = lm[WRIST]
        d_tip = dist_3d(wrist, lm[THUMB_TIP])
        d_ip = dist_3d(wrist, lm[THUMB_IP])
        return d_tip > d_ip * 1.15

    def analyze_hand_state(self, lm):
        thumb_ext = self.is_thumb_extended(lm)
        index_ext = self.is_finger_extended(lm, INDEX_TIP, INDEX_PIP, INDEX_MCP)
        middle_ext = self.is_finger_extended(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP)
        ring_ext = self.is_finger_extended(lm, RING_TIP, RING_PIP, RING_MCP)
        pinky_ext = self.is_finger_extended(lm, PINKY_TIP, PINKY_PIP, PINKY_MCP)
        
        extended_count = sum([thumb_ext, index_ext, middle_ext, ring_ext, pinky_ext])
        is_open_palm = extended_count >= 4 and index_ext and middle_ext and pinky_ext
        is_fist = extended_count <= 1 and not index_ext and not middle_ext and not ring_ext and not pinky_ext
        is_two_finger = index_ext and middle_ext and not ring_ext and not pinky_ext
        is_claw_or_cupped = (not is_open_palm) and (not is_fist) and (dist_3d(lm[THUMB_TIP], lm[INDEX_TIP]) < 0.18)
        
        return {
            "extended_count": extended_count,
            "thumb": thumb_ext,
            "index": index_ext,
            "middle": middle_ext,
            "ring": ring_ext,
            "pinky": pinky_ext,
            "is_open_palm": is_open_palm,
            "is_fist": is_fist,
            "is_two_finger": is_two_finger,
            "is_claw_or_cupped": is_claw_or_cupped,
            "wrist": lm[WRIST],
            "palm_center": lm[MIDDLE_MCP]
        }

    def process_frame(self, hand_landmarks_list):
        now = time.time()
        dt = max(now - self.prev_time, 0.001)
        self.prev_time = now
        
        num_hands = len(hand_landmarks_list)
        detected_gesture = None
        confidence = 0.0
        
        # Calculate wrist velocities
        velocities = []
        for i, lm in enumerate(hand_landmarks_list):
            if i < len(self.prev_landmarks):
                prev_w = self.prev_landmarks[i][WRIST]
                curr_w = lm[WRIST]
                vx = (curr_w.x - prev_w.x) / dt
                vy = (curr_w.y - prev_w.y) / dt
                speed = math.sqrt(vx**2 + vy**2)
                velocities.append({"vx": vx, "vy": vy, "speed": speed})
            else:
                velocities.append({"vx": 0.0, "vy": 0.0, "speed": 0.0})
        self.prev_landmarks = hand_landmarks_list
        self.wrist_velocities = velocities

        if num_hands == 0:
            self.candidate_gesture = None
            return None, 0.0, self.get_cooldown_status()

        # Two-hand Jutsu check
        if num_hands >= 2:
            h1 = self.analyze_hand_state(hand_landmarks_list[0])
            h2 = self.analyze_hand_state(hand_landmarks_list[1])
            wrist_dist = dist_2d(h1["wrist"], h2["wrist"])
            palms_dist = dist_2d(h1["palm_center"], h2["palm_center"])
            
            # 1. Ultimate Shadow Army: Both hands raised high (y < 0.38) with open palms
            if h1["is_open_palm"] and h2["is_open_palm"] and h1["wrist"].y < 0.38 and h2["wrist"].y < 0.38:
                detected_gesture = "shadow_army"
                confidence = 0.95
            
            # 2. Fireball Jutsu: Both hands close together (palms/wrists touching, Tiger seal) and pushed forward
            elif wrist_dist < 0.16 or palms_dist < 0.16:
                # Check for Substitution X-cross vs Fireball
                # Crossed wrists: wrists close, fingertips point outward or crossed
                # Fireball: hands pressed together pointing up/forward
                if abs(h1["wrist"].x - h2["wrist"].x) < 0.08 and abs(h1["wrist"].y - h2["wrist"].y) < 0.08 and not (h1["is_fist"] or h2["is_fist"]):
                    # If hands are crossed in X formation (substitution)
                    if (hand_landmarks_list[0][INDEX_TIP].x - hand_landmarks_list[1][INDEX_TIP].x) * (h1["wrist"].x - h2["wrist"].x) < 0:
                        detected_gesture = "substitution"
                        confidence = 0.92
                    else:
                        detected_gesture = "fireball"
                        confidence = 0.90
                else:
                    detected_gesture = "fireball"
                    confidence = 0.88

        # Single-hand Jutsu check
        if not detected_gesture and num_hands >= 1:
            h = self.analyze_hand_state(hand_landmarks_list[0])
            speed = velocities[0]["speed"] if velocities else 0.0
            vx = velocities[0]["vx"] if velocities else 0.0

            # 3. Fist tracking for Explosive Jutsu
            if h["is_fist"]:
                self.fist_detected_time = now
                self.candidate_gesture = "charging_fist"
                self.candidate_confidence = 0.85

            # If opened hand right after a fist -> Explosive Jutsu!
            if h["is_open_palm"] and (now - self.fist_detected_time < 0.75):
                detected_gesture = "explosive"
                confidence = 0.95
                self.fist_detected_time = 0.0  # reset
                
            # 4. Teleportation / Body Flicker: High lateral swipe
            elif abs(vx) > 1.8 and speed > 2.0:
                detected_gesture = "teleport"
                confidence = 0.90
                
            # 5. Chidori: Two fingers extended (spear hand), thrusting forward or fast movement
            elif h["is_two_finger"] and (speed > 0.8 or h["wrist"].z < -0.05):
                detected_gesture = "chidori"
                confidence = 0.88
                
            # 6. Flashbang: Two fingers held upright in steady classic shinobi seal
            elif h["is_two_finger"] and speed < 0.8:
                detected_gesture = "flashbang"
                confidence = 0.86
                
            # 7. Rasengan: Claw/cupped palm or circular hand swirling
            elif h["is_claw_or_cupped"]:
                self.rasengan_charge += dt * 1.5
                if self.rasengan_charge > 0.6:
                    detected_gesture = "rasengan"
                    confidence = min(0.95, 0.7 + self.rasengan_charge * 0.2)
            else:
                self.rasengan_charge = max(0.0, self.rasengan_charge - dt)

            # 8. Chakra Shield: Open palm held facing camera steadily (low speed, held still)
            if not detected_gesture and h["is_open_palm"]:
                if speed < 0.4 and h["wrist"].y > 0.3:
                    detected_gesture = "chakra_shield"
                    confidence = 0.85
                elif h["wrist"].y <= 0.35:
                    # 9. Shadow Clone Jutsu: Open palm raised high
                    detected_gesture = "shadow_clone"
                    confidence = 0.90

        # Temporal filter & cooldown verification
        triggered_ability = None
        hold_progress = 0.0

        if detected_gesture:
            if self.candidate_gesture == detected_gesture:
                duration = now - self.candidate_start_time
                req_duration = self.hold_thresholds.get(detected_gesture, 0.3)
                hold_progress = min(1.0, duration / req_duration)
                
                # Check if hold duration met and cooldown passed
                if duration >= req_duration:
                    cd_remaining = self.get_remaining_cooldown(detected_gesture)
                    if cd_remaining <= 0.0:
                        triggered_ability = detected_gesture
                        self.last_trigger_time[detected_gesture] = now
                        self.candidate_gesture = None
                        self.candidate_start_time = 0.0
                        self.rasengan_charge = 0.0
            else:
                self.candidate_gesture = detected_gesture
                self.candidate_start_time = now
                self.candidate_confidence = confidence
                hold_progress = 0.1
        else:
            self.candidate_gesture = None
            self.candidate_start_time = 0.0

        return triggered_ability, hold_progress, self.get_cooldown_status()

    def get_remaining_cooldown(self, ability):
        last = self.last_trigger_time.get(ability, 0.0)
        cd = self.cooldowns.get(ability, 1.0)
        remaining = (last + cd) - time.time()
        return max(0.0, remaining)

    def get_cooldown_status(self):
        return {
            ability: {
                "remaining": round(self.get_remaining_cooldown(ability), 2),
                "total": self.cooldowns[ability],
                "ready": self.get_remaining_cooldown(ability) <= 0.0
            }
            for ability in self.cooldowns
        }

async def vision_worker(broadcast_queue):
    ensure_model_exists()
    
    base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )
    detector = vision.HandLandmarker.create_from_options(options)
    engine = GestureEngine()
    
    cap = cv2.VideoCapture(CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    if not cap.isOpened():
        print(f"[Vision] Warning: Camera {CAMERA_INDEX} could not be opened. Running in fallback mode.")
        while True:
            await asyncio.sleep(1)
            
    print(f"[Vision] Camera {CAMERA_INDEX} opened successfully. Processing at 640x480.")
    frame_count = 0
    fps_start = time.time()
    current_fps = 30.0

    while True:
        ret, frame = cap.read()
        if not ret:
            await asyncio.sleep(0.01)
            continue
            
        frame_count += 1
        if frame_count % 30 == 0:
            current_fps = round(30.0 / (time.time() - fps_start), 1)
            fps_start = time.time()

        # Flip horizontally for natural mirror display
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        
        result = detector.detect(mp_image)
        
        landmarks_data = []
        if result.hand_landmarks:
            for hand_lms in result.hand_landmarks:
                pts = [{"x": round(lm.x, 4), "y": round(lm.y, 4), "z": round(lm.z, 4)} for lm in hand_lms]
                landmarks_data.append(pts)

        triggered, hold_prog, cds = engine.process_frame(result.hand_landmarks or [])
        
        payload = {
            "type": "frame",
            "timestamp": round(time.time(), 3),
            "fps": current_fps,
            "hands_count": len(landmarks_data),
            "landmarks": landmarks_data,
            "candidate": engine.candidate_gesture,
            "hold_progress": round(hold_prog, 2),
            "triggered": triggered,
            "cooldowns": cds
        }
        
        # Non-blocking broadcast
        if broadcast_queue.qsize() < 2:
            await broadcast_queue.put(payload)
            
        await asyncio.sleep(0.015)  # Cap at ~60Hz processing

async def websocket_handler(websocket, broadcast_queue, connected_clients):
    connected_clients.add(websocket)
    client_ip = websocket.remote_address
    print(f"[WebSocket] Client connected: {client_ip}. Total: {len(connected_clients)}")
    
    try:
        # Welcome message
        await websocket.send(json.dumps({
            "type": "connection",
            "status": "connected",
            "message": "Ninja Vision Engine Online",
            "version": "1.0.0"
        }))
        
        async for message in websocket:
            # Client can send commands (e.g. calibrate, set cooldowns, ping)
            try:
                data = json.loads(message)
                if data.get("action") == "ping":
                    await websocket.send(json.dumps({"type": "pong", "time": time.time()}))
            except Exception:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.remove(websocket)
        print(f"[WebSocket] Client disconnected: {client_ip}. Remaining: {len(connected_clients)}")

async def broadcaster(broadcast_queue, connected_clients):
    while True:
        payload = await broadcast_queue.get()
        if connected_clients:
            msg = json.dumps(payload)
            # Broadcast to all connected clients
            dead_clients = set()
            for client in connected_clients:
                try:
                    await client.send(msg)
                except Exception:
                    dead_clients.add(client)
            connected_clients.difference_update(dead_clients)

async def main():
    print("=" * 60)
    print("  3D NINJA ACADEMY: SHADOW JUTSU SIMULATOR - VISION SERVER  ")
    print("=" * 60)
    print(f"[Server] WebSocket listening on ws://localhost:{WS_PORT}")
    
    broadcast_queue = asyncio.Queue()
    connected_clients = set()

    # Start WebSocket server
    server = await websockets.serve(
        lambda ws: websocket_handler(ws, broadcast_queue, connected_clients),
        "0.0.0.0",
        WS_PORT
    )

    # Start background vision processing and broadcaster
    await asyncio.gather(
        vision_worker(broadcast_queue),
        broadcaster(broadcast_queue, connected_clients)
    )

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Server] Shutdown requested. Shinobi retreat!")
