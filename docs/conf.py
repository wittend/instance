# Configuration file for the Sphinx documentation builder.
# Read the Docs style docs using the Furo theme.

project = 'flow-dash'
copyright = '2025'
author = 'flow-dash contributors'

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.napoleon',
    'sphinx.ext.todo',
]

templates_path = ['_templates']
exclude_patterns = []

html_theme = 'furo'
html_title = 'flow-dash docs'

# Options for HTML output
html_static_path = ['_static']

# TODO extension setup
todo_include_todos = True
