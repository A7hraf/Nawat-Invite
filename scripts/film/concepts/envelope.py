"""Envelope: the original sealed-envelope film (scripts/film/scene.py), recoloured per theme."""
import os, runpy, sys


def build(ctx):
    runpy.run_path(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scene.py"), run_name="__main__")
    sys.exit(0)
