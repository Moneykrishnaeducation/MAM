import asyncio

from adminPanel.models import AdminUser, ClientUser
from backendPanel.database import ensure_db_initialized


async def test():
    await ensure_db_initialized()
    users = await ClientUser.all()
    print("Client Users:", users)
    admins = await AdminUser.all()
    print("Admin Users:", admins)

if __name__ == "__main__":
    asyncio.run(test())
