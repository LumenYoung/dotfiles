return {
  {
    "akinsho/toggleterm.nvim",
    lazy = true,
  },
  {
    "AstroNvim/astrocore",
    dependencies = { "akinsho/toggleterm.nvim" },
    opts = function(_, opts)
      local Terminal = require("toggleterm.terminal").Terminal
      local tabterm = Terminal:new {
        hidden = true,
        direction = "tab",
        count = 97,
      }

      _G.toggle_tabterm = function() tabterm:toggle() end

      opts.mappings = opts.mappings or {}
      opts.mappings.n = opts.mappings.n or {}
      opts.mappings.n["<leader>tt"] = { _G.toggle_tabterm, desc = "Toggle Tab Terminal" }

      return opts
    end,
  },
}
