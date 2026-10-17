$ErrorActionPreference = "Stop"

$tempIndex = Join-Path $PSScriptRoot "..\.git\temp_gh_pages_index"
if (Test-Path $tempIndex) {
    Remove-Item $tempIndex -Force
}

$env:GIT_INDEX_FILE = $tempIndex
git --work-tree=frontend/dist add -A
$tree = (git write-tree).Trim()
Remove-Item $tempIndex -Force
Remove-Item env:GIT_INDEX_FILE

$parent = (git rev-parse origin/gh-pages).Trim()
$commit = (git commit-tree $tree -p $parent -m "deploy: update gh-pages with borrower payment system").Trim()
git update-ref refs/heads/gh-pages $commit
Write-Host "Created gh-pages commit: $commit"

Write-Host "Pushing to origin gh-pages..."
git push origin gh-pages:gh-pages

Write-Host "Pushing to tonghengkeo gh-pages..."
git push tonghengkeo gh-pages:gh-pages

Write-Host "gh-pages deployment successfully pushed to both remotes!"
