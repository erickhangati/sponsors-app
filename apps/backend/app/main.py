from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import auth, admin, users, sponsorships, payments, child_reports, sponsors
from .database import Base, engine

# 🚀 Initialize FastAPI Application
app = FastAPI(
    title="Sponsorship Management API",
    description="An API for managing sponsorships, users, payments, and reports.",
    version="1.0.0"
)

# Create database tables (Only for initial setup)
# For production, use Alembic migrations instead of `create_all()`
Base.metadata.create_all(bind=engine)

# 🌍 Enable Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    # Only allow your frontend origin
    allow_credentials=True,  # Required for cookies/auth headers
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🔗 Register API routers (modular route handling)
app.include_router(auth.router)  # Authentication routes
app.include_router(users.router)  # User management routes
app.include_router(sponsorships.router)  # Sponsorship management routes

app.include_router(sponsors.router)
app.include_router(payments.router)  # Payment processing routes
app.include_router(child_reports.router)  # Child report management routes
app.include_router(admin.router)  # 🛠Admin panel routes
