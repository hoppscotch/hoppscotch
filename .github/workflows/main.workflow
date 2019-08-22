workflow "Pocket Lint" {
  on = "push"
  resolves = "pocket-lint"
}

action "pocket-lint" {
  uses = "PatMyron/pocket-lint@master"
  secrets = ["GITHUB_TOKEN"] # optional for added functionality
}
