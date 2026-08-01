"""CRUD operations for clientPanel models."""

from clientPanel.models import (
    ClientAccount,
    ClientProfile,
    ClientTicket,
    ClientTransaction,
    MyInvestment,
)


async def get_client_profile(user_id: int) -> ClientProfile | None:
    """Get client profile by user ID."""
    return await ClientProfile.filter(user_id=user_id).first()


async def create_client_profile(
    user_id: int, full_name: str, email: str, phone: str | None = None
) -> ClientProfile:
    """Create a new client profile."""
    return await ClientProfile.create(
        user_id=user_id, full_name=full_name, email=email, phone=phone
    )


async def get_client_accounts(profile_id: int) -> list[ClientAccount]:
    """Get client trading accounts."""
    return await ClientAccount.filter(client_profile_id=profile_id).all()


async def get_client_investments(profile_id: int) -> list[MyInvestment]:
    """Get client investments."""
    return await MyInvestment.filter(client_profile_id=profile_id).all()


async def get_client_transactions(profile_id: int) -> list[ClientTransaction]:
    """Get client transactions."""
    return await ClientTransaction.filter(client_profile_id=profile_id).all()


async def get_client_tickets(profile_id: int) -> list[ClientTicket]:
    """Get client support tickets."""
    return await ClientTicket.filter(client_profile_id=profile_id).all()
