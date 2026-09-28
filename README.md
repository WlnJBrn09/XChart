# XChart

XChart is a local chart editor built with the same Rust API, static web UI, and native WebView host used by XWrite, XSlide, and XSheet. The interface uses the suite’s sidebar, title bar, glass toolbar, inspector, solid work surface, light/dark themes, and local document library.

## Features

Bar, line, area, pie, and scatter charts; editable series and labels; svg, png, csv, and json export.

- Open CSV, TSV, and XChart JSON from the file picker or the user's Documents folder.
- Save editable documents in the local app store. The native host stores data under the platform app-data folder; `cargo run` uses `./documents`.
- Print or save a PDF through the browser's Print command.

## Run

```sh
cargo run
```

Open `http://127.0.0.1:8790`. To build and launch the native host:

```sh
npm run native
```

Run `npm run dist:deb` (Debian/Ubuntu) or `npm run dist:rpm` (Fedora/RHEL/openSUSE) to build a package. CI builds and smoke-tests both.

## File support

Charts render from structured data in the browser. Import accepts CSV, TSV, and the app’s JSON format.

## License

MIT
