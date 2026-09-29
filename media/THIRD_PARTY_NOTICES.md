# Third-Party Notices

This project reproduces parts of the Visual Studio Code user interface for the
purpose of native-parity rendering inside its own webviews.

## Microsoft Visual Studio Code (MIT)

- Reference version: **1.139.1**
- License: MIT (see <https://github.com/microsoft/vscode/blob/main/LICENSE.txt>)
- Vendored assets:
  - `media/loading.svg`, `media/loading-dark.svg`, `media/loading-hc.svg`
    (copied from the VS Code 1.139.1 build's `out/media/` folder)
- Reference-derived stylesheets (values and rules re-authored or ported):
  - `media/native-base.css`
  - `media/sidebar.css`
  - `media/detail.css`
  - `media/markdown.css`

The MIT license permits use, copy, modification, and distribution with the
copyright notice and permission notice retained. Original copyright:
Copyright (c) Microsoft Corporation. All rights reserved.

`@vscode/codicons` is distributed under its own MIT license and is already a
declared dependency of this project (`media/codicons/` is copied from it at
build time).
