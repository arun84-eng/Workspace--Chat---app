import asyncio
import websockets

TOKEN = "PASTE_YOUR_NEW_TOKEN_HERE"

async def test():

    async with websockets.connect(
        f"ws://127.0.0.1:8000/ws/notifications?token={TOKEN}"
    ) as ws:

        print("Notification socket connected")

        while True:
            msg = await ws.recv()
            print(msg)

asyncio.run(test())