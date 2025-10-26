"""Pytest configuration for simulator tests"""
import sys
from pathlib import Path

# Add parent directory to path so we can import main module
simulator_dir = Path(__file__).parent.parent
sys.path.insert(0, str(simulator_dir))
