import asyncio
import websockets

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwidXNlcl9pZCI6NSwiZXhwIjoxNzgyNDA4MzIyfQ.ZsizEulJbncebwsv-WRgrcAT46nE5luaAwy6b3Qe_j4"

async def test():

    async with websockets.connect(
        f"ws://127.0.0.1:8000/ws/notifications?token={TOKEN}"
    ) as ws:

        print("Notification socket connected")

        while True:
            msg = await ws.recv()
            print(msg)

asyncio.run(test())