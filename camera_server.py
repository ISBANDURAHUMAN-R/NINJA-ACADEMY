"""
Shadow Jutsu Camera Server - Live Webcam Footage & Real-Time Tracking on Big Screen
Captures webcam via OpenCV, tracks hands via MediaPipe HandLandmarker locally,
draws glowing neon skeleton tracking, composites real video shadow clones & jutsu effects,
and streams directly to the browser via high-speed MJPEG & FastAPI!
"""

import asyncio
import cv2
import json
import math
import os
import sys
import time
import numpy as np

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from fastapi import FastAPI, Response, Request
from fastapi.responses import StreamingResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hand_landmarker.task")
PORT = 8080

app = FastAPI(title="Shadow Jutsu Camera")

# Global Camera & Jutsu State
class CameraJutsuEngine:
    def __init__(self):
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        self.cap.set(cv2.CAP_PROP_FPS, 30)

        # Initialize MediaPipe HandLandmarker
        base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
        options = vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=vision.RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=0.45,
            min_hand_presence_confidence=0.45,
            min_tracking_confidence=0.45
        )
        self.detector = vision.HandLandmarker.create_from_options(options)

        # Video Frame History Buffer for Real Video Clones
        self.frame_buffer = []
        self.max_buffer = 90  # ~3 seconds at 30fps

        # Active Jutsu Modes
        self.clones_mode = "none"  # "none", "shadow_clones" (3 clones), "shadow_army" (12 clones)
        self.active_rasengan = False
        self.rasengan_state = "none"
        self.rasengan_pos = (0, 0)
        self.rasengan_radius = 50
        self.rasengan_start = 0

        self.active_chidori = False
        self.chidori_time = 0

        self.active_fireball = False
        self.fireball_pos = [0, 0]
        self.fireball_radius = 40

        self.active_substitution = False
        self.substitute_end_time = 0

        self.active_shield = False
        self.shield_end_time = 0

        self.candidate_gesture = "None"
        self.candidate_gesture_name = "NONE"
        self.gesture_frame_count = 0
        self.last_triggered_gesture = "NONE"
        self.current_jutsu_name = "None"
        self.show_skeleton = True
        self.smoke_puffs = []
        self.last_trigger_time = 0
        self.last_hand_pos = (640, 480)
        self.last_finger_pos = (640, 400)

        # Hand bone connections
        self.connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),       # Thumb
            (0, 5), (5, 6), (6, 7), (7, 8),       # Index
            (0, 9), (9, 10), (10, 11), (11, 12),  # Middle
            (0, 13), (13, 14), (14, 15), (15, 16),# Ring
            (0, 17), (17, 18), (18, 19), (19, 20),# Pinky
            (5, 9), (9, 13), (13, 17), (0, 17)    # Palm base
        ]

    def trigger_jutsu(self, name):
        now = time.time()
        self.last_trigger_time = now

        if name == "shadow_clones":
            self.current_jutsu_name = "SHADOW CLONES"
            self.clones_mode = "shadow_clones"
            self.add_smoke_explosion(0.2, 0.5)
            self.add_smoke_explosion(0.8, 0.5)
            self.add_smoke_explosion(0.35, 0.35)
        elif name == "shadow_army":
            self.current_jutsu_name = "SHADOW ARMY"
            self.clones_mode = "shadow_army"
            for x, y in [(0.15, 0.3), (0.35, 0.25), (0.65, 0.25), (0.85, 0.3), (0.2, 0.6), (0.8, 0.6)]:
                self.add_smoke_explosion(x, y)
        elif name == "clear_clones":
            self.current_jutsu_name = "CLONES DISPERSED"
            self.clones_mode = "none"
            self.add_smoke_explosion(0.2, 0.5)
            self.add_smoke_explosion(0.8, 0.5)
            self.add_smoke_explosion(0.35, 0.35)
            self.add_smoke_explosion(0.5, 0.5)
        elif name == "substitution":
            self.current_jutsu_name = "SUBSTITUTION LOG"
            self.active_substitution = True
            self.substitute_end_time = now + 3.2
            self.add_smoke_explosion(0.5, 0.55)
        elif name == "rasengan":
            self.current_jutsu_name = "RASENGAN"
            self.active_rasengan = True
            self.rasengan_state = "charging"
            self.rasengan_radius = 45
            self.rasengan_start = now
        elif name == "chidori":
            self.current_jutsu_name = "CHIDORI"
            self.active_chidori = True
            self.chidori_time = now + 2.5
        elif name == "fireball":
            self.current_jutsu_name = "FIREBALL"
            self.active_fireball = True
            self.fireball_radius = 45
            self.fireball_pos = [float(self.last_finger_pos[0]), float(self.last_finger_pos[1])]
        elif name == "shield":
            self.current_jutsu_name = "CHAKRA SHIELD"
            self.active_shield = True
            self.shield_end_time = now + 3.5

    def add_smoke_explosion(self, x_frac, y_frac):
        for _ in range(16):
            angle = np.random.uniform(0, math.pi * 2)
            speed = np.random.uniform(6, 18)
            self.smoke_puffs.append({
                "x_frac": x_frac + np.random.uniform(-0.03, 0.03),
                "y_frac": y_frac + np.random.uniform(-0.03, 0.03),
                "vx": math.cos(angle) * speed,
                "vy": math.sin(angle) * speed - 4,
                "r": np.random.uniform(30, 55),
                "life": 1.0,
                "decay": np.random.uniform(0.04, 0.08)
            })

    def process_and_draw(self, frame):
        h, w = frame.shape[:2]
        # Natural mirror flip
        frame = cv2.flip(frame, 1)

        # Store in rolling buffer for video clones
        buffer_frame = frame.copy()
        self.frame_buffer.append(buffer_frame)
        if len(self.frame_buffer) > self.max_buffer:
            self.frame_buffer.pop(0)

        # Run MediaPipe hand detection
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self.detector.detect(mp_image)

        hands_landmarks = result.hand_landmarks or []
        primary_hand_pos = (int(w * 0.65), int(h * 0.6))
        fingertip_pos = (int(w * 0.65), int(h * 0.5))

        # 1. RENDER REAL VIDEO SHADOW CLONES (Behind User)
        if self.clones_mode == "shadow_clones" and len(self.frame_buffer) > 5:
            # 3 clones: Left (delay 12), Right (delay 24), Top-Left (delay 36)
            clones_spec = [
                {"x": int(w * 0.16), "y": int(h * 0.35), "scale": 0.75, "delay": 12},
                {"x": int(w * 0.84), "y": int(h * 0.35), "scale": 0.75, "delay": 24},
                {"x": int(w * 0.32), "y": int(h * 0.18), "scale": 0.60, "delay": 36}
            ]
            for spec in clones_spec:
                idx = max(0, len(self.frame_buffer) - 1 - min(len(self.frame_buffer) - 1, spec["delay"]))
                c_frame = self.frame_buffer[idx]
                cw, ch = int(w * spec["scale"]), int(h * spec["scale"])
                resized = cv2.resize(c_frame, (cw, ch))
                x1, y1 = max(0, spec["x"] - cw // 2), max(0, spec["y"] - ch // 2)
                x2, y2 = min(w, x1 + cw), min(h, y1 + ch)
                crop_w, crop_h = x2 - x1, y2 - y1
                if crop_w > 0 and crop_h > 0:
                    roi = frame[y1:y2, x1:x2]
                    patch = resized[:crop_h, :crop_w]
                    # Alpha blend clone with cyan chakra tint
                    cyan_tint = np.full_like(patch, (255, 230, 0), dtype=np.uint8) # BGR cyan
                    tinted = cv2.addWeighted(patch, 0.85, cyan_tint, 0.15, 0)
                    blended = cv2.addWeighted(roi, 0.25, tinted, 0.75, 0)
                    frame[y1:y2, x1:x2] = blended
                    # Cyan outline box around clone
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 240, 0), 2)
                    cv2.putText(frame, "SHADOW CLONE", (x1 + 10, y1 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 240, 0), 2)

        elif self.clones_mode == "shadow_army" and len(self.frame_buffer) > 5:
            # 10 Army Clones in grid formation
            army = [
                {"x": int(w * 0.12), "y": int(h * 0.22), "s": 0.45, "d": 45},
                {"x": int(w * 0.32), "y": int(h * 0.18), "s": 0.45, "d": 40},
                {"x": int(w * 0.50), "y": int(h * 0.15), "s": 0.42, "d": 50},
                {"x": int(w * 0.68), "y": int(h * 0.18), "s": 0.45, "d": 35},
                {"x": int(w * 0.88), "y": int(h * 0.22), "s": 0.45, "d": 30},
                {"x": int(w * 0.18), "y": int(h * 0.45), "s": 0.65, "d": 25},
                {"x": int(w * 0.82), "y": int(h * 0.45), "s": 0.65, "d": 20},
                {"x": int(w * 0.25), "y": int(h * 0.68), "s": 0.75, "d": 15},
                {"x": int(w * 0.75), "y": int(h * 0.68), "s": 0.75, "d": 12}
            ]
            for spec in army:
                idx = max(0, len(self.frame_buffer) - 1 - min(len(self.frame_buffer) - 1, spec["d"]))
                c_frame = self.frame_buffer[idx]
                cw, ch = int(w * spec["s"]), int(h * spec["s"])
                resized = cv2.resize(c_frame, (cw, ch))
                x1, y1 = max(0, spec["x"] - cw // 2), max(0, spec["y"] - ch // 2)
                x2, y2 = min(w, x1 + cw), min(h, y1 + ch)
                crop_w, crop_h = x2 - x1, y2 - y1
                if crop_w > 0 and crop_h > 0:
                    roi = frame[y1:y2, x1:x2]
                    patch = resized[:crop_h, :crop_w]
                    blended = cv2.addWeighted(roi, 0.3, patch, 0.7, 0)
                    frame[y1:y2, x1:x2] = blended
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 240, 0), 1)

        # 2. SUBSTITUTION JUTSU (Replaces center user with wooden log)
        now = time.time()
        if self.active_substitution:
            if now < self.substitute_end_time:
                # Draw wooden log block over center
                lx1, ly1 = int(w * 0.35), int(h * 0.28)
                lx2, ly2 = int(w * 0.65), int(h * 0.85)
                # Wood color
                log_color = (30, 70, 120)  # BGR brown
                cv2.rectangle(frame, (lx1, ly1), (lx2, ly2), log_color, -1)
                cv2.rectangle(frame, (lx1, ly1), (lx2, ly2), (15, 40, 80), 6)
                cv2.ellipse(frame, ((lx1 + lx2)//2, ly1), ((lx2 - lx1)//2, 30), 0, 0, 360, (60, 120, 180), -1)
                cv2.putText(frame, "SUBSTITUTION LOG", (lx1 + 20, ly1 + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
            else:
                self.active_substitution = False
                self.add_smoke_explosion(0.5, 0.55)

        # 3. LIVE HAND TRACKING & SKELETON OVERLAY (BIG ON SCREEN!)
        if hands_landmarks and self.show_skeleton:
            detected = "NONE"
            label = "HAND DETECTED"

            # Check if 2 hands are present -> ULTIMATE SHADOW ARMY
            if len(hands_landmarks) >= 2:
                detected = "SHADOW_ARMY"
                label = "2 HANDS: SHADOW ARMY"

            for hand_idx, hand in enumerate(hands_landmarks):
                pts = [(int(lm.x * w), int(lm.y * h)) for lm in hand]
                wrist = pts[0]
                palm_center = pts[9]
                primary_hand_pos = palm_center
                fingertip_pos = pts[8]

                self.last_hand_pos = palm_center
                self.last_finger_pos = pts[8]

                # Draw glowing bone connections (neon cyan & green)
                for i1, i2 in self.connections:
                    p1 = pts[i1]
                    p2 = pts[i2]
                    # Thick cyan bone
                    cv2.line(frame, p1, p2, (255, 240, 0), 4, cv2.LINE_AA)
                    # Core white highlight
                    cv2.line(frame, p1, p2, (255, 255, 255), 1, cv2.LINE_AA)

                # Draw glowing joint points
                for idx, pt in enumerate(pts):
                    r = 8 if idx in [4, 8, 12, 16, 20] else 5
                    color = (0, 80, 255) if idx == 0 else (0, 255, 128) # Red wrist, green fingertips
                    cv2.circle(frame, pt, r, color, -1, cv2.LINE_AA)
                    cv2.circle(frame, pt, r + 2, (255, 255, 255), 1, cv2.LINE_AA)

                # Hand Bounding Box
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                bx1, by1 = max(0, min(xs) - 20), max(0, min(ys) - 20)
                bx2, by2 = min(w, max(xs) + 20), min(h, max(ys) + 20)
                cv2.rectangle(frame, (bx1, by1), (bx2, by2), (0, 240, 255), 2, cv2.LINE_AA)

                # Palm Chakra Reticle
                cv2.circle(frame, palm_center, 22, (255, 200, 0), 2, cv2.LINE_AA)
                cv2.circle(frame, palm_center, 8, (255, 255, 255), -1, cv2.LINE_AA)

                # =============================================================
                # ULTRA-EASY FINGER COUNT GESTURE RECOGNITION (Foolproof & Instant)
                # =============================================================
                dist = lambda p1, p2: math.hypot(p1[0] - p2[0], p1[1] - p2[1])

                # Check 4 main fingers: Index, Middle, Ring, Pinky
                index_ext = (dist(pts[8], wrist) > dist(pts[6], wrist) * 1.05) and (dist(pts[8], pts[5]) > dist(pts[6], pts[5]) * 1.15)
                middle_ext = (dist(pts[12], wrist) > dist(pts[10], wrist) * 1.05) and (dist(pts[12], pts[9]) > dist(pts[10], pts[9]) * 1.15)
                ring_ext = (dist(pts[16], wrist) > dist(pts[14], wrist) * 1.05) and (dist(pts[16], pts[13]) > dist(pts[14], pts[13]) * 1.15)
                pinky_ext = (dist(pts[20], wrist) > dist(pts[18], wrist) * 1.05) and (dist(pts[20], pts[17]) > dist(pts[18], pts[17]) * 1.15)
                ext_count = sum([index_ext, middle_ext, ring_ext, pinky_ext])

                # Thumb pointing UP or DOWN check
                thumb_up = (pts[4][1] < pts[2][1] - 25) and (pts[4][1] < pts[0][1] - 30)
                thumb_down = (pts[4][1] > pts[2][1] + 25) and (pts[4][1] > pts[0][1] + 25)

                if len(hands_landmarks) == 1:
                    if ext_count == 0:
                        if thumb_up:
                            detected = "SUBSTITUTION"
                            label = "👍 THUMB UP: SUBSTITUTION"
                        elif thumb_down:
                            detected = "CLEAR_CLONES"
                            label = "👎 THUMB DOWN: DISPERSE CLONES"
                        else:
                            detected = "RASENGAN"
                            label = "✊ FIST: RASENGAN"
                    elif ext_count == 1:
                        detected = "FIREBALL"
                        label = "☝️ 1 FINGER: FIREBALL"
                    elif ext_count == 2:
                        detected = "CHIDORI"
                        label = "✌️ 2 FINGERS: CHIDORI"
                    elif ext_count == 3:
                        detected = "CLEAR_CLONES"
                        label = "👌 3 FINGERS: DISPERSE CLONES"
                    else: # 4 or 5 fingers extended -> open hand!
                        detected = "SHADOW_CLONES"
                        label = f"✋ OPEN HAND: SHADOW CLONES ({ext_count} FINGERS)"

                # Floating Holographic Chakra Tag above Hand
                tag_w = min(360, w - bx1 - 5)
                tag_y1 = max(10, by1 - 42)
                tag_y2 = max(20, by1 - 8)
                cv2.rectangle(frame, (bx1, tag_y1), (bx1 + tag_w, tag_y2), (12, 18, 28), -1)
                cv2.rectangle(frame, (bx1, tag_y1), (bx1 + tag_w, tag_y2), (0, 240, 255), 2, cv2.LINE_AA)
                cv2.putText(frame, label, (bx1 + 10, tag_y2 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.58, (255, 255, 255), 2, cv2.LINE_AA)

            # Smooth Debounced Trigger Logic
            if detected == self.candidate_gesture_name:
                self.gesture_frame_count += 1
            else:
                self.candidate_gesture_name = detected
                self.gesture_frame_count = 1

            self.candidate_gesture = label

            # Instant trigger on gesture switch (held for 2 frames ~60ms) or 3s repeat:
            if self.gesture_frame_count >= 2:
                if detected != self.last_triggered_gesture or (now - self.last_trigger_time > 3.0):
                    self.last_triggered_gesture = detected
                    self.last_trigger_time = now
                    if detected == "SHADOW_CLONES":
                        self.trigger_jutsu("shadow_clones")
                    elif detected == "SHADOW_ARMY":
                        self.trigger_jutsu("shadow_army")
                    elif detected == "RASENGAN":
                        self.trigger_jutsu("rasengan")
                    elif detected == "CHIDORI":
                        self.trigger_jutsu("chidori")
                    elif detected == "FIREBALL":
                        self.trigger_jutsu("fireball")
                    elif detected == "SUBSTITUTION":
                        self.trigger_jutsu("substitution")
                    elif detected == "CLEAR_CLONES":
                        self.trigger_jutsu("clear_clones")
        else:
            self.candidate_gesture = "READY: SHOW HAND"
            self.candidate_gesture_name = "NONE"
            self.gesture_frame_count = 0
            self.last_triggered_gesture = "NONE"

        # 4. AR RASENGAN (CINEMATIC ANIME CYCLONE: 8 Spiral Arms, 24 3D Orbiting Chakra Particles, Surface Micro-Lightning & Shockwaves)
        if self.active_rasengan:
            rx, ry = primary_hand_pos
            if self.rasengan_state == "charging":
                self.rasengan_pos = (rx, ry)
                self.rasengan_radius = min(95, self.rasengan_radius + 2.5)
                if now - self.rasengan_start > 0.9:
                    self.rasengan_state = "launched"
            elif self.rasengan_state == "launched":
                self.rasengan_pos = (self.rasengan_pos[0], self.rasengan_pos[1] - 28)
                self.rasengan_radius += 3.5
                if self.rasengan_pos[1] < 40 or self.rasengan_radius > 190:
                    self.add_smoke_explosion(self.rasengan_pos[0]/w, 0.2)
                    self.active_rasengan = False

            if self.active_rasengan:
                px, py = int(self.rasengan_pos[0]), int(self.rasengan_pos[1])
                r = int(self.rasengan_radius)

                # Outer Translucent Chakra Glow Canvas (Additive Blend)
                overlay = frame.copy()
                cv2.circle(overlay, (px, py), int(r * 1.45), (255, 140, 0), -1, cv2.LINE_AA) # Deep Chakra Blue
                cv2.circle(overlay, (px, py), int(r * 1.15), (255, 200, 30), -1, cv2.LINE_AA) # Electric Cyan
                cv2.circle(overlay, (px, py), int(r * 0.85), (255, 240, 100), -1, cv2.LINE_AA) # Bright Cyan
                cv2.circle(overlay, (px, py), int(r * 0.45), (255, 255, 255), -1, cv2.LINE_AA) # Hyper-white Core
                cv2.addWeighted(overlay, 0.45, frame, 0.55, 0, frame)

                # 8 High-Speed Logarithmic Cyclone Spiral Arms
                spin_phase = now * 14.0
                num_arms = 8
                for arm in range(num_arms):
                    base_ang = (arm * (2 * math.pi / num_arms)) + spin_phase
                    pts_spiral = []
                    for step in range(12):
                        frac = step / 11.0
                        cur_r = frac * r * 1.15
                        cur_ang = base_ang + frac * 2.8
                        sx = int(px + math.cos(cur_ang) * cur_r)
                        sy = int(py + math.sin(cur_ang) * cur_r)
                        pts_spiral.append((sx, sy))
                    for idx_s in range(len(pts_spiral) - 1):
                        p1 = pts_spiral[idx_s]
                        p2 = pts_spiral[idx_s + 1]
                        cv2.line(frame, p1, p2, (255, 220, 0), 3, cv2.LINE_AA)
                        cv2.line(frame, p1, p2, (255, 255, 255), 1, cv2.LINE_AA)

                # Dynamic 3D Orbiting Chakra Particles (Swarm of 24 filaments)
                for p_idx in range(24):
                    p_ang = (now * (12.0 + (p_idx % 5) * 2.0)) + (p_idx * (2 * math.pi / 24))
                    tilt = (p_idx % 4) * (math.pi / 4)
                    dist_r = (0.35 + 0.65 * ((p_idx * 7) % 11) / 10.0) * r
                    p_x = int(px + dist_r * math.cos(p_ang))
                    p_y = int(py + dist_r * math.sin(p_ang) * math.cos(tilt))
                    tail_x = int(px + (dist_r * 0.85) * math.cos(p_ang - 0.25))
                    tail_y = int(py + (dist_r * 0.85) * math.sin(p_ang - 0.25) * math.cos(tilt))
                    cv2.line(frame, (tail_x, tail_y), (p_x, p_y), (255, 230, 0), 2, cv2.LINE_AA)
                    cv2.circle(frame, (p_x, p_y), 4, (255, 255, 255), -1, cv2.LINE_AA)

                # 4 Crackling Micro-Chakra Lightning Filaments on Orb Surface
                for _ in range(4):
                    l_ang1 = np.random.uniform(0, math.pi * 2)
                    l_ang2 = l_ang1 + np.random.uniform(0.6, 1.4)
                    x1 = int(px + math.cos(l_ang1) * r * 0.9)
                    y1 = int(py + math.sin(l_ang1) * r * 0.9)
                    x2 = int(px + math.cos(l_ang2) * r * 0.9)
                    y2 = int(py + math.sin(l_ang2) * r * 0.9)
                    mid_x = (x1 + x2) // 2 + np.random.randint(-15, 15)
                    mid_y = (y1 + y2) // 2 + np.random.randint(-15, 15)
                    cv2.line(frame, (x1, y1), (mid_x, mid_y), (255, 240, 50), 2, cv2.LINE_AA)
                    cv2.line(frame, (mid_x, mid_y), (x2, y2), (255, 255, 255), 1, cv2.LINE_AA)

                # Pulsating Concentric Aerodynamic Shockwave Rings
                ring_phase = (now * 5.0) % 1.0
                ring_r = int(r * (0.8 + ring_phase * 0.6))
                cv2.circle(frame, (px, py), ring_r, (255, 255, 255), 1, cv2.LINE_AA)
                cv2.ellipse(frame, (px, py), (int(r * 1.3), int(r * 0.5)), int(now * 300) % 360, 0, 360, (255, 230, 0), 2, cv2.LINE_AA)
                cv2.ellipse(frame, (px, py), (int(r * 1.3), int(r * 0.5)), (int(now * 300) + 90) % 360, 0, 360, (255, 255, 255), 2, cv2.LINE_AA)

        # 5. AR CHIDORI LIGHTNING (ULTRA-HIGH GRAPHICS: Recursive Fractal Branching, Inter-Finger Arcs, 30+ Sparks & Plasma Core)
        if self.active_chidori and now < self.chidori_time:
            fx, fy = fingertip_pos
            px, py = primary_hand_pos

            # Hand-Anchored Blinding Plasma Core (Additive Glow)
            overlay = frame.copy()
            cv2.circle(overlay, (px, py), 95, (255, 180, 0), -1, cv2.LINE_AA) # Deep Electric Blue
            cv2.circle(overlay, (px, py), 60, (255, 230, 80), -1, cv2.LINE_AA) # Bright Cyan
            cv2.circle(overlay, (px, py), 30, (255, 255, 255), -1, cv2.LINE_AA) # White-Hot Core
            cv2.addWeighted(overlay, 0.52, frame, 0.48, 0, frame)

            # 12 Major Recursive Fractal Lightning Bolts
            for _ in range(12):
                bolt_len = np.random.randint(90, 250)
                angle = np.random.uniform(0, math.pi * 2)
                end_x = int(px + math.cos(angle) * bolt_len)
                end_y = int(py + math.sin(angle) * bolt_len)

                cur_x, cur_y = px, py
                num_segs = np.random.randint(4, 7)
                for seg in range(1, num_segs + 1):
                    frac = seg / float(num_segs)
                    jitter = 22
                    nx = int(px + (end_x - px) * frac + np.random.randint(-jitter, jitter))
                    ny = int(py + (end_y - py) * frac + np.random.randint(-jitter, jitter))

                    # Thick glowing cyan outer sheath + razor white core
                    cv2.line(frame, (cur_x, cur_y), (nx, ny), (255, 240, 0), 4, cv2.LINE_AA)
                    cv2.line(frame, (cur_x, cur_y), (nx, ny), (255, 255, 255), 2, cv2.LINE_AA)

                    # 35% chance to fork a child branch!
                    if np.random.rand() < 0.35:
                        fork_len = np.random.randint(25, 65)
                        fork_ang = angle + np.random.uniform(-0.9, 0.9)
                        fork_nx = int(nx + math.cos(fork_ang) * fork_len)
                        fork_ny = int(ny + math.sin(fork_ang) * fork_len)
                        cv2.line(frame, (nx, ny), (fork_nx, fork_ny), (255, 200, 0), 2, cv2.LINE_AA)
                        cv2.line(frame, (nx, ny), (fork_nx, fork_ny), (255, 255, 255), 1, cv2.LINE_AA)

                    cur_x, cur_y = nx, ny

            # Arcs jumping directly between all 5 fingertips
            if hands_landmarks:
                pts_h = [(int(lm.x * w), int(lm.y * h)) for lm in hands_landmarks[0]]
                tips = [4, 8, 12, 16, 20]
                for i in range(len(tips) - 1):
                    t1, t2 = pts_h[tips[i]], pts_h[tips[i+1]]
                    mid = ((t1[0] + t2[0]) // 2 + np.random.randint(-16, 16),
                           (t1[1] + t2[1]) // 2 + np.random.randint(-16, 16))
                    cv2.line(frame, t1, mid, (255, 240, 0), 3, cv2.LINE_AA)
                    cv2.line(frame, mid, t2, (255, 240, 0), 3, cv2.LINE_AA)
                    cv2.line(frame, t1, mid, (255, 255, 255), 1, cv2.LINE_AA)
                    cv2.line(frame, mid, t2, (255, 255, 255), 1, cv2.LINE_AA)

            # 30+ High-Velocity Plasma Sparks flying off hand
            for _ in range(30):
                sp_r = np.random.randint(20, 190)
                sp_ang = np.random.uniform(0, math.pi * 2)
                sp_x = int(px + math.cos(sp_ang) * sp_r)
                sp_y = int(py + math.sin(sp_ang) * sp_r)
                cv2.circle(frame, (sp_x, sp_y), np.random.randint(1, 4), (255, 255, 255), -1, cv2.LINE_AA)
                cv2.circle(frame, (sp_x, sp_y), np.random.randint(3, 7), (255, 230, 0), 1, cv2.LINE_AA)
        elif now >= self.chidori_time:
            self.active_chidori = False

        # 6. AR CHAKRA SHIELD
        if self.active_shield and now < self.shield_end_time:
            sx, sy = primary_hand_pos
            hex_pts = []
            for i in range(6):
                ang = i * (math.pi / 3)
                hx = int(sx + math.cos(ang) * 140)
                hy = int(sy + math.sin(ang) * 140)
                hex_pts.append([hx, hy])
            hex_pts = np.array(hex_pts, np.int32)
            cv2.polylines(frame, [hex_pts], True, (255, 240, 0), 4, cv2.LINE_AA)
            cv2.circle(frame, (sx, sy), 90, (255, 200, 0), 2, cv2.LINE_AA)
        elif now >= self.shield_end_time:
            self.active_shield = False

        # 7. AR FIREBALL (KATON GOKAKYU: Multi-Layer Turbulent Magma Vortex, Swirling Flame Tendrils, Fiery Embers & Shockwaves)
        if self.active_fireball:
            self.fireball_pos[1] -= 24 # Rushing forward/upward
            self.fireball_radius += 4.5
            fx, fy = int(self.fireball_pos[0]), int(self.fireball_pos[1])
            fr = int(self.fireball_radius)

            # Additive Volumetric Fire Glow Canvas
            overlay = frame.copy()
            cv2.circle(overlay, (fx, fy), int(fr * 1.55), (15, 25, 220), -1, cv2.LINE_AA) # Deep Crimson Red
            cv2.circle(overlay, (fx, fy), int(fr * 1.25), (10, 110, 255), -1, cv2.LINE_AA) # Raging Orange
            cv2.circle(overlay, (fx, fy), int(fr * 0.90), (20, 210, 255), -1, cv2.LINE_AA) # Blazing Gold
            cv2.circle(overlay, (fx, fy), int(fr * 0.50), (220, 250, 255), -1, cv2.LINE_AA) # White-hot Epicenter
            cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)

            # 16 Organic Turbulent Flame Lobes (Oscillating Flame Cells)
            time_ang = now * 8.0
            num_lobes = 16
            for l_idx in range(num_lobes):
                l_angle = (l_idx * (2 * math.pi / num_lobes)) + time_ang * 0.25
                wobble = math.sin(time_ang + l_idx * 1.3) * 0.22 + math.cos(time_ang * 1.7 + l_idx) * 0.15
                lobe_r = fr * (0.85 + wobble)
                lx = int(fx + math.cos(l_angle) * lobe_r)
                ly = int(fy + math.sin(l_angle) * lobe_r)
                sub_r = int(fr * (0.35 + 0.15 * math.sin(l_idx * 2.1)))
                cv2.circle(frame, (lx, ly), sub_r, (15, 90, 255), -1, cv2.LINE_AA)
                cv2.circle(frame, (lx, ly), int(sub_r * 0.6), (20, 200, 255), -1, cv2.LINE_AA)

            # 10 Swirling Flame Vortex Tendrils (Curling Backwards Aerodynamically)
            for t_idx in range(10):
                t_base = (t_idx * (2 * math.pi / 10)) + time_ang
                curve_pts = []
                for step in range(8):
                    frac = step / 7.0
                    c_r = fr * (0.4 + frac * 0.9)
                    c_ang = t_base + frac * 1.9
                    tx = int(fx + math.cos(c_ang) * c_r)
                    ty = int(fy + math.sin(c_ang) * c_r + frac * 35)
                    curve_pts.append((tx, ty))
                for s_i in range(len(curve_pts) - 1):
                    p1 = curve_pts[s_i]
                    p2 = curve_pts[s_i + 1]
                    cv2.line(frame, p1, p2, (0, 140, 255), 4, cv2.LINE_AA)
                    cv2.line(frame, p1, p2, (200, 255, 255), 2, cv2.LINE_AA)

            # Concentric Expanding Flame Shockwave Rings
            ring_p = (now * 6.0) % 1.0
            cv2.circle(frame, (fx, fy), int(fr * (1.1 + ring_p * 0.45)), (0, 160, 255), 2, cv2.LINE_AA)
            cv2.circle(frame, (fx, fy), int(fr * (1.3 + ring_p * 0.45)), (0, 80, 255), 1, cv2.LINE_AA)

            # 45+ Flying Burning Embers and Trailing Fire Sparks
            for _ in range(45):
                em_r = np.random.uniform(fr * 0.3, fr * 1.8)
                em_ang = np.random.uniform(0, math.pi * 2)
                em_x = int(fx + math.cos(em_ang) * em_r + np.random.randint(-15, 15))
                em_y = int(fy + math.sin(em_ang) * em_r + np.random.randint(10, 60))
                spark_color = (0, np.random.randint(140, 240), 255)
                cv2.circle(frame, (em_x, em_y), np.random.randint(2, 5), spark_color, -1, cv2.LINE_AA)
                cv2.circle(frame, (em_x, em_y), 1, (255, 255, 255), -1, cv2.LINE_AA)

            # Inner Radiant Sun Core
            cv2.circle(frame, (fx, fy), int(fr * 0.45), (10, 220, 255), -1, cv2.LINE_AA)
            cv2.circle(frame, (fx, fy), int(fr * 0.25), (240, 255, 255), -1, cv2.LINE_AA)

            if fy < -60:
                self.active_fireball = False

        # 8. SMOKE PARTICLES
        for p in self.smoke_puffs[:]:
            p["x_frac"] += p["vx"] / w
            p["y_frac"] += p["vy"] / h
            p["r"] += 1.5
            p["life"] -= p["decay"]
            if p["life"] <= 0:
                self.smoke_puffs.remove(p)
            else:
                px = int(p["x_frac"] * w)
                py = int(p["y_frac"] * h)
                pr = int(p["r"])
                alpha = p["life"]
                # Soft white-gray smoke circle
                cv2.circle(frame, (px, py), pr, (230, 240, 250), -1, cv2.LINE_AA)

        # 9. TOP HUD OVERLAY (PROMINENT ON BIG SCREEN)
        cv2.rectangle(frame, (0, 0), (w, 55), (10, 14, 22), -1)
        cv2.line(frame, (0, 55), (w, 55), (0, 240, 255), 2)
        cv2.putText(frame, "SHADOW JUTSU CAMERA - LIVE STREAM", (25, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (255, 255, 255), 2, cv2.LINE_AA)
        status_str = f"ACTIVE: {self.current_jutsu_name}" if self.current_jutsu_name != "None" else "READY: SHOW HAND"
        cv2.putText(frame, status_str, (w - 440, 36), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 240, 255), 2, cv2.LINE_AA)

        # 10. BOTTOM QUICK GUIDE STRIP (INSTANT REFERENCE)
        cv2.rectangle(frame, (0, h - 38), (w, h), (10, 14, 22), -1)
        cv2.line(frame, (0, h - 38), (w, h - 38), (0, 240, 255), 1)
        guide_txt = "EASY SIGNS: ✋ 5=Clones | 👎/3=Disperse Clones | ✊ Fist=Rasengan | ✌️ 2=Chidori | ☝️ 1=Fireball | 👍 Thumb=Log | 🙌 2 Hands=Army"
        cv2.putText(frame, guide_txt, (20, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (200, 240, 255), 1, cv2.LINE_AA)

        return frame

engine = CameraJutsuEngine()

def generate_frames():
    while True:
        success, frame = engine.cap.read()
        if not success:
            time.sleep(0.01)
            continue

        processed = engine.process_and_draw(frame)
        ret, buffer = cv2.imencode('.jpg', processed, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
        if not ret:
            continue

        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.get("/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/trigger/{name}")
def trigger(name: str):
    engine.trigger_jutsu(name)
    return {"status": "ok", "jutsu": name, "clones_mode": engine.clones_mode}

@app.get("/status")
def status():
    return {
        "gesture": engine.candidate_gesture,
        "active_jutsu": engine.current_jutsu_name,
        "clones_mode": engine.clones_mode,
        "rasengan": engine.active_rasengan,
        "chidori": engine.active_chidori,
        "fireball": engine.active_fireball,
        "substitution": engine.active_substitution
    }

@app.get("/")
def index():
    return FileResponse("index.html")

# Mount static CSS & JS
app.mount("/css", StaticFiles(directory="css"), name="css")
app.mount("/js", StaticFiles(directory="js"), name="js")

if __name__ == "__main__":
    print(f"[Server] Starting Shadow Jutsu Camera on http://localhost:{PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
