# server.py

from http.server import BaseHTTPRequestHandler, HTTPServer
import json

HOST = "localhost"
PORT = 8000

class MyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        user = {
            "id": 123,
            "name": "Admin User",
            "email": "admin@example.com",
            "is_superuser": True,
        }

        user_json = json.dumps(user)

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header(
            "Set-Cookie",
            f"user={user_json}; Path=/; Max-Age=86400; SameSite=Lax"
        )
        self.end_headers()

        response = {
            "message": "User cookie has been set.",
            "user": user
        }

        self.wfile.write(json.dumps(response).encode("utf-8"))


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), MyHandler)
    print(f"Server running at http://{HOST}:{PORT}")
    server.serve_forever()