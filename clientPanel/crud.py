"""Client-specific data loader functions using central adminPanel models."""

from adminPanel.models import (
    ClientAccount,
    ClientTicket,
    ClientTransaction,
    MyInvestment,
    ClientUser,
)


async def get_client_profile_by_user_id(user_id: int) -> ClientUser | None:
    """Load the client user record for a specific client user only."""
    return await ClientUser.filter(id=user_id).first()


async def get_client_accounts_by_user_id(user_id: int) -> list[ClientAccount]:
    """Load MT5 trading account details for a specific client user only."""
    profile = await get_client_profile_by_user_id(user_id)
    if profile is None:
        return []
    return await ClientAccount.filter(user_id=profile.id).all()


async def get_client_investments_by_user_id(user_id: int) -> list[MyInvestment]:
    """Load allocated investments for a specific client user only."""
    profile = await get_client_profile_by_user_id(user_id)
    if profile is None:
        return []
    return await MyInvestment.filter(user_id=profile.id).all()


async def get_client_transactions_by_user_id(user_id: int) -> list[ClientTransaction]:
    """Load deposit & withdrawal transactions for a specific client user only."""
    profile = await get_client_profile_by_user_id(user_id)
    if profile is None:
        return []
    return await ClientTransaction.filter(user_id=profile.id).all()


async def get_client_tickets_by_user_id(user_id: int) -> list[ClientTicket]:
    """Load support tickets for a specific client user only."""
    profile = await get_client_profile_by_user_id(user_id)
    if profile is None:
        return []
    return await ClientTicket.filter(user_id=profile.id).all()


async def create_client_profile(
    user_id: int,
    full_name: str,
    email: str,
    phone: str | None = None,
    country: str = "United States",
) -> ClientUser:
    """Create or update the client user profile fields."""
    user = await ClientUser.filter(id=user_id).first()
    if user is None:
        raise ValueError("Client user not found")
    user.full_name = full_name
    user.name = full_name
    user.email = email
    user.phone = phone
    user.country = country
    await user.save()
    return user
