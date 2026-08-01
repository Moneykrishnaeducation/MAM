"""Client-specific data loader functions using central adminPanel models."""

from adminPanel.models import (
    ClientAccount,
    ClientProfile,
    ClientTicket,
    ClientTransaction,
    MyInvestment,
)


async def get_client_profile_by_user_id(user_id: int) -> ClientProfile | None:
    """Load profile for a specific client user only."""
    return await ClientProfile.filter(user_id=user_id).first()


async def get_client_accounts_by_user_id(user_id: int) -> list[ClientAccount]:
    """Load MT5 trading account details for a specific client user only."""
    profile = await get_client_profile_by_user_id(user_id)
    if profile is None:
        return []
    return await ClientAccount.filter(client_profile_id=profile.id).all()


async def get_client_investments_by_user_id(user_id: int) -> list[MyInvestment]:
    """Load allocated investments for a specific client user only."""
    profile = await get_client_profile_by_user_id(user_id)
    if profile is None:
        return []
    return await MyInvestment.filter(client_profile_id=profile.id).all()


async def get_client_transactions_by_user_id(user_id: int) -> list[ClientTransaction]:
    """Load deposit & withdrawal transactions for a specific client user only."""
    profile = await get_client_profile_by_user_id(user_id)
    if profile is None:
        return []
    return await ClientTransaction.filter(client_profile_id=profile.id).all()


async def get_client_tickets_by_user_id(user_id: int) -> list[ClientTicket]:
    """Load support tickets for a specific client user only."""
    profile = await get_client_profile_by_user_id(user_id)
    if profile is None:
        return []
    return await ClientTicket.filter(client_profile_id=profile.id).all()


async def create_client_profile(
    user_id: int, full_name: str, email: str, phone: str | None = None
) -> ClientProfile:
    """Create a new client profile."""
    return await ClientProfile.create(
        user_id=user_id, full_name=full_name, email=email, phone=phone
    )
