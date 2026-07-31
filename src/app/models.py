"""Tortoise ORM models."""

from tortoise import fields, models


class User(models.Model):
    """User model."""

    id = fields.IntField(primary_key=True)
    email = fields.CharField(max_length=255, unique=True, index=True)
    name = fields.CharField(max_length=255, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "users"

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


class Post(models.Model):
    """Post model - example model for reference."""

    id = fields.IntField(primary_key=True)
    title = fields.CharField(max_length=255)
    content = fields.TextField(null=True)
    author_id = fields.IntField(index=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "posts"

    def __repr__(self) -> str:
        return f"<Post(id={self.id}, title={self.title})>"
