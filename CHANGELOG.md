# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-08

### Added
- Initial wrapper + bridge implementation for Cursor ACP.
- Session persistence for `sessionName -> cursorSessionId`.
- Deploy/rollback scripts for OpenClaw plugin integration.
- Integration and unit tests.
- Install/uninstall scripts for production setup.

### Fixed
- Wrapper execution when `ACPX_REAL` points to JavaScript entry (`node <file>.js` fallback).
- ACP client compatibility for auth retry, permission option ids, and session load params.
