#!/usr/bin/env python3
"""
8WHIE IPv6 Proxy Manager
Setup and Packaging
Author: Aryan Thakur (8WHIE)
"""

from setuptools import setup, find_packages
import os

here = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(here, "README.md"), encoding="utf-8") as f:
    long_description = f.read()

setup(
    name="8whie-ipv6-proxy",
    version="1.0.0",
    description="A self-hosted IPv6 multi-proxy management system for Linux servers",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Aryan Thakur",
    author_email="contact@8whie.internal",
    url="https://github.com/8whie/8whie-ipv6-proxy",
    license="Apache-2.0",
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: System Administrators",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: POSIX :: Linux",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Internet :: Proxy Servers",
        "Topic :: System :: Networking",
    ],
    packages=find_packages(),
    include_package_data=True,
    python_requires=">=3.9",
    install_requires=[
        "click>=8.1.7",
        "rich>=13.7.1",
        "PyYAML>=6.0.1",
        "bcrypt>=4.1.2",
    ],
    entry_points={
        "console_scripts": [
            "8whie-proxy=src.cli:cli",
        ],
    },
)
