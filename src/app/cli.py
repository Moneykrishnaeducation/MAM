"""Rich console helpers for MAM."""

from rich.console import Console

console = Console()


def print_banner() -> None:
    """Print a styled startup banner."""
    console.print("[bold cyan]MAM[/bold cyan] — built with Better Fullstack")
