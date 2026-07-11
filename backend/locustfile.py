"""
Stress test untuk backend ZFreelance.

Cara pakai:
    1. Pastikan backend sudah jalan (npm run dev) di http://localhost:3000
    2. pip install locust
    3. locust -f locustfile.py
    4. Buka http://localhost:8089 di browser
    5. Isi:
         Number of users: 50
         Ramp up: 5
         Host: http://localhost:3000
    6. Klik "Start swarming", biarkan jalan 60 detik, lalu klik "Stop"
    7. Screenshot tab "Charts" dan "Failures" untuk video demo

Catatan: setiap virtual user akan register dengan wallet address dummy
yang unik (beda per user), lalu login untuk dapat token JWT asli,
baru mulai kirim request ke endpoint yang butuh auth.
"""

import uuid
from locust import HttpUser, task, between


class ZFreelanceUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Dipanggil sekali di awal, sebelum user ini mulai kirim task."""
        # Wallet address dummy yang unik per virtual user, biar tidak bentrok
        self.wallet_address = "0x" + uuid.uuid4().hex[:40]
        self.password = "stresstest123"
        self.token = None

        # Register user testing ini
        self.client.post(
            "/api/auth/register",
            json={
                "walletAddress": self.wallet_address,
                "name": "Stress Test User",
                "password": self.password,
                "role": "freelancer",
            },
            name="/api/auth/register",
        )

        # Login untuk dapat token
        res = self.client.post(
            "/api/auth/login",
            json={
                "walletAddress": self.wallet_address,
                "password": self.password,
            },
            name="/api/auth/login",
        )

        if res.status_code == 200:
            self.token = res.json().get("token")

    def auth_headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @task(3)
    def get_gigs(self):
        self.client.get(
            "/api/gigs?status=Open&page=1",
            headers=self.auth_headers(),
            name="/api/gigs",
        )

    @task(1)
    def get_profile(self):
        self.client.get(
            f"/api/profile/{self.wallet_address}",
            headers=self.auth_headers(),
            name="/api/profile/:walletAddress",
        )