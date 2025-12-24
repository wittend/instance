# SPDX-License-Identifier: GPL-3.0-or-later
#
# Configuration file for the Sphinx documentation builder.
# Read the Docs style docs using the Furo theme.

project = 'instance'
copyright = '2025'
author = 'instance contributors'

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
    'sphinx.ext.todo',
    'sphinxcontrib.mermaid',
]

templates_path = ['_templates']
exclude_patterns = []

html_theme = 'furo'
html_title = 'instance docs'

# Options for HTML output
html_static_path = ['_static']

# TODO extension setup
todo_include_todos = True
