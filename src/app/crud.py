"""CRUD operations for Tortoise ORM models."""

from app.models import Post, User


# User CRUD operations
async def get_user(user_id: int) -> User | None:
    """Get a user by ID."""
    return await User.filter(id=user_id).first()


async def get_user_by_email(email: str) -> User | None:
    """Get a user by email."""
    return await User.filter(email=email).first()


async def get_users(skip: int = 0, limit: int = 100) -> list[User]:
    """Get a list of users with pagination."""
    return await User.all().offset(skip).limit(limit)


async def create_user(email: str, name: str | None = None) -> User:
    """Create a new user."""
    return await User.create(email=email, name=name)


async def update_user(
    user_id: int, email: str | None = None, name: str | None = None
) -> User | None:
    """Update a user."""
    user = await get_user(user_id)
    if user is None:
        return None

    if email is not None:
        user.email = email
    if name is not None:
        user.name = name

    await user.save()
    return user


async def delete_user(user_id: int) -> bool:
    """Delete a user."""
    user = await get_user(user_id)
    if user is None:
        return False

    await user.delete()
    return True


# Post CRUD operations
async def get_post(post_id: int) -> Post | None:
    """Get a post by ID."""
    return await Post.filter(id=post_id).first()


async def get_posts(skip: int = 0, limit: int = 100) -> list[Post]:
    """Get a list of posts with pagination."""
    return await Post.all().offset(skip).limit(limit)


async def get_posts_by_author(author_id: int) -> list[Post]:
    """Get all posts by an author."""
    return await Post.filter(author_id=author_id).all()


async def create_post(title: str, author_id: int, content: str | None = None) -> Post:
    """Create a new post."""
    return await Post.create(title=title, content=content, author_id=author_id)


async def update_post(
    post_id: int, title: str | None = None, content: str | None = None
) -> Post | None:
    """Update a post."""
    post = await get_post(post_id)
    if post is None:
        return None

    if title is not None:
        post.title = title
    if content is not None:
        post.content = content

    await post.save()
    return post


async def delete_post(post_id: int) -> bool:
    """Delete a post."""
    post = await get_post(post_id)
    if post is None:
        return False

    await post.delete()
    return True
