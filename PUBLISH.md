# Publish to GitHub

## 1) Prepare metadata

- Update `package.json`:
  - `repository.url`
  - `bugs.url`
  - `homepage`
- Update `CHANGELOG.md`

## 2) Verify quality

```bash
npm test
```

## 3) Create repository and push

```bash
git init
git add .
git commit -m "chore: prepare acp2acpx for public release"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## 4) Tag release

```bash
git tag v0.1.0
git push origin v0.1.0
```
