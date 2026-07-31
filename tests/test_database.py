"""Tests for Tortoise ORM models and CRUD operations."""

import pytest
from tortoise import Tortoise

from app import crud
from app.models import Post, User


@pytest.fixture(autouse=True)
async def initialize_tests():
    """Initialize Tortoise ORM for testing."""
    await Tortoise.init(db_url="sqlite://:memory:", modules={"models": ["app.models"]})
    await Tortoise.generate_schemas()
    yield
    await Tortoise.close_connections()


class TestUserModel:
    """Tests for User model."""

    async def test_create_user(self):
        """Test creating a user."""
        user = await User.create(email="test@example.com", name="Test User")

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.created_at is not None
        assert user.updated_at is not None

    async def test_user_repr(self):
        """Test User string representation."""
        user = await User.create(email="repr@example.com")
        assert "repr@example.com" in repr(user)


class TestPostModel:
    """Tests for Post model."""

    async def test_create_post(self):
        """Test creating a post."""
        user = await User.create(email="author@example.com")
        post = await Post.create(title="Test Post", content="Test content", author_id=user.id)

        assert post.id is not None
        assert post.title == "Test Post"
        assert post.content == "Test content"
        assert post.author_id == user.id
        assert post.created_at is not None
        assert post.updated_at is not None

    async def test_post_repr(self):
        """Test Post string representation."""
        post = await Post.create(title="Test Title", author_id=1)
        assert "Test Title" in repr(post)


class TestUserCrud:
    """Tests for User CRUD operations."""

    async def test_create_user(self):
        """Test creating a user via CRUD."""
        user = await crud.create_user(email="crud@example.com", name="CRUD User")

        assert user.id is not None
        assert user.email == "crud@example.com"
        assert user.name == "CRUD User"

    async def test_get_user(self):
        """Test getting a user by ID."""
        user = await User.create(email="get@example.com")
        result = await crud.get_user(user.id)
        assert result is not None
        assert result.email == "get@example.com"

    async def test_get_user_not_found(self):
        """Test getting a non-existent user."""
        result = await crud.get_user(999)
        assert result is None

    async def test_get_user_by_email(self):
        """Test getting a user by email."""
        user = await User.create(email="email@example.com")
        result = await crud.get_user_by_email("email@example.com")
        assert result is not None
        assert result.id == user.id

    async def test_get_users(self):
        """Test listing users with pagination."""
        for i in range(5):
            await User.create(email=f"user{i}@example.com")

        users = await crud.get_users()
        assert len(users) == 5

        users = await crud.get_users(limit=2)
        assert len(users) == 2

    async def test_delete_user(self):
        """Test deleting a user."""
        user = await User.create(email="delete@example.com")
        result = await crud.delete_user(user.id)
        assert result is True
        assert await crud.get_user(user.id) is None

    async def test_delete_user_not_found(self):
        """Test deleting a non-existent user."""
        result = await crud.delete_user(999)
        assert result is False


class TestPostCrud:
    """Tests for Post CRUD operations."""

    async def test_create_post(self):
        """Test creating a post via CRUD."""
        user = await User.create(email="postauthor@example.com")
        post = await crud.create_post(title="CRUD Post", author_id=user.id, content="Content")

        assert post.id is not None
        assert post.title == "CRUD Post"
        assert post.author_id == user.id

    async def test_get_post(self):
        """Test getting a post by ID."""
        post = await Post.create(title="Get Post", author_id=1)
        result = await crud.get_post(post.id)
        assert result is not None
        assert result.title == "Get Post"

    async def test_get_posts(self):
        """Test listing posts with pagination."""
        for i in range(5):
            await Post.create(title=f"Post {i}", author_id=1)

        posts = await crud.get_posts()
        assert len(posts) == 5

        posts = await crud.get_posts(limit=2)
        assert len(posts) == 2

    async def test_delete_post(self):
        """Test deleting a post."""
        post = await Post.create(title="Delete Post", author_id=1)
        result = await crud.delete_post(post.id)
        assert result is True
        assert await crud.get_post(post.id) is None
