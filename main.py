from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import asyncio

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Küresel görev durumu
task_status = {
    "is_running": False,
    "operation_type": None,
    "current_index": 0,
    "processed_count": 0,
    "scan_limit": 0,
    "follow_limit": 0,
    "completed": False,
    "error": None,
    "users": [],
}

stop_flag = False

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/task/follow")
async def follow_users(request: Request):
    global task_status, stop_flag
    form = await request.json()

    task_status = {
        "is_running": True,
        "operation_type": "follow",
        "current_index": 0,
        "processed_count": 0,
        "scan_limit": int(form.get("scan_limit", 1000)),
        "follow_limit": int(form.get("follow_limit", 500)),
        "completed": False,
        "error": None,
        "users": [],
    }

    stop_flag = False
    asyncio.create_task(simulate_following())
    return {"status": "started"}

@app.post("/api/task/unfollow")
async def unfollow_users(request: Request):
    global task_status, stop_flag
    form = await request.json()

    task_status = {
        "is_running": True,
        "operation_type": "unfollow",
        "current_index": 0,
        "processed_count": 0,
        "scan_limit": int(form.get("scan_limit", 1000)),
        "follow_limit": int(form.get("follow_limit", 500)),
        "completed": False,
        "error": None,
        "users": [],
    }

    stop_flag = False
    asyncio.create_task(simulate_following())  # aynı simülasyon işini kullanıyoruz
    return {"status": "started"}

@app.get("/api/task/status")
async def check_status():
    return task_status

@app.post("/api/task/stop")
async def stop_task():
    global stop_flag
    stop_flag = True
    return {"status": "success"}

# Simülasyon fonksiyonu (gerçek Bluesky entegrasyonu yerine dummy verilerle çalışır)
async def simulate_following():
    global task_status, stop_flag
    try:
        for i in range(task_status["scan_limit"]):
            if stop_flag:
                task_status["error"] = "Operation manually stopped."
                break

            await asyncio.sleep(0.2)  # Hız: 1 kullanıcı = 0.2 saniye
            task_status["current_index"] += 1

            if task_status["processed_count"] < task_status["follow_limit"]:
                fake_user = {
                    "handle": f"user{i}@example.com",
                    "displayName": f"User {i}"
                }
                task_status["users"].append(fake_user)
                task_status["processed_count"] += 1
        task_status["completed"] = True
        task_status["is_running"] = False
    except Exception as e:
        task_status["error"] = str(e)
        task_status["is_running"] = False
