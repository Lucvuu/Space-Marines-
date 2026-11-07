# -*- coding: utf-8 -*-
"""
Pytest compatibility wrapper:
Allows running 'python -m pytest -q' or 'pytest' even if pytest package
is not installed globally, delegating cleanly to tests/test_core.py.
"""
import sys
import unittest

def main():
    # If real pytest is available in sys.modules or site-packages, use it
    try:
        import pytest as real_pytest
        if hasattr(real_pytest, "main") and real_pytest.__file__ != __file__:
            return real_pytest.main()
    except ImportError:
        pass

    # Fallback to standard library unittest
    loader = unittest.TestLoader()
    suite = loader.discover("tests", pattern="test_*.py")
    verbosity = 1 if "-q" in sys.argv else 2
    runner = unittest.TextTestRunner(verbosity=verbosity)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)

if __name__ == "__main__":
    main()
