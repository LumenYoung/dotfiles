return {
  -- AstroNvim v6 configures nvim-treesitter-textobjects via `opts`, which
  -- requires the plugin's `main` branch module exposing `setup()`. AstroNvim's
  -- pinned snapshot can otherwise select the frozen `master` branch, whose
  -- module only exposes `init()` and fails during lazy.nvim config.
  "nvim-treesitter/nvim-treesitter-textobjects",
  branch = "main",
  commit = "851e865342e5a4cb1ae23d31caf6e991e1c99f1e",
}
