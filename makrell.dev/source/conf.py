# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

import os
import sys
# from pygments.lexers import get_lexer_by_name
from sphinx.highlighting import lexers
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from makrell_lexer import MakrellLexer

lexers['makrell'] = MakrellLexer()

project = 'Makrell'
copyright = '2025, Hans-Christian Holm'
author = 'Hans-Christian Holm'
# release = '0.9'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    'myst_parser',
]

templates_path = ['_templates']
exclude_patterns = []

# if os.getenv("GITHUB_ACTIONS") or os.getenv("TRAVIS") or os.getenv("CIRCLECI") or os.getenv("GITLAB_CI"):
#     extensions.append("sphinxcontrib.googleanalytics")
#     googleanalytics_id = "G-3431CMCBXW"
extensions.append("sphinxcontrib.googleanalytics")
googleanalytics_id = "G-3431CMCBXW"

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

# html_theme = 'alabaster'
html_theme = 'furo'
html_static_path = ['_static']

html_css_files = [
    # "https://cdnjs.cloudflare.com/ajax/libs/cookieconsent2/3.1.0/cookieconsent.min.css"
    'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@3.0.1/dist/cookieconsent.css'
]

html_js_files = [
    # "https://cdnjs.cloudflare.com/ajax/libs/cookieconsent2/3.1.0/cookieconsent.min.js",
    'https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@3.1.0/dist/cookieconsent.umd.js',
    "cookie-init.js"  # This script initializes the banner
]
