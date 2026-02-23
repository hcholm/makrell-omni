Some ideas for a static site generator where everything is Makrell. No plain Python.

Templates are in MRML with inine MakrellPy code.

Content is in mixed format .mr files with MRON including MRML for body text etc.

Builder script is MakrellPy. Should be a CLI with erbuild, watch etc.

Functional techniques are widely used, typically returning mrml objects. Some inspiration maybe from Elm, TSX, Lisp, Zope/Plone and XSLT.

Should support hierarchical content with nested pages and sections. Subsections may override style, layout etc. of parent sections.

Output to a dist folder, including HTML, CSS, JS, images etc. Static assets may be copied from a source folder.

Should also have a search function.