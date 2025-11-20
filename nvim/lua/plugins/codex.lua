return {
  {
    "johnseth97/codex.nvim",
    cmd = { "Codex", "CodexToggle" },
    event = "VeryLazy",
    opts = {
      keymaps = {
        toggle = nil, -- keep plugin from adding its own toggle mapping
        quit = "<C-q>",
      },
      border = "double",
      width = 0.85,
      height = 0.85,
      model = nil,
      autoinstall = true,
      panel = false,
      use_buffer = false,
    },
  },
  {
    "AstroNvim/astrocore",
    opts = function(_, opts)
      local toggle_codex = function() require("codex").toggle() end

      opts.mappings = opts.mappings or {}
      opts.mappings.n = opts.mappings.n or {}
      opts.mappings.t = opts.mappings.t or {}

      opts.mappings.n["<leader>tc"] = { "<cmd>CodexToggle<cr>", desc = "Toggle Codex" }
      opts.mappings.n["<C-Space>"] = { toggle_codex, desc = "Toggle Codex" }
      opts.mappings.t["<C-Space>"] = { "<cmd>CodexToggle<cr>", desc = "Toggle Codex" }

      return opts
    end,
  },
}
