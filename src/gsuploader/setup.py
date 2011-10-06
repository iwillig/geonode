#!/usr/bin/env python

from setuptools import setup, find_packages

setup(name = "gsuploader.py",
    version = "1.0",
    description = "GeoServer REST Uploader Client",
    keywords = "GeoServer REST Uploader",
    license = "MIT",
    url = "https://github.com/opengeo/MapStory",
    author = "Ian Schneider",
    author_email = "ischneider@opengeo.org",
    install_requires = ['httplib2'],
    package_dir = {'':'src'},
    packages = find_packages('src'),
    test_suite = "test.uploadtests"
) 

