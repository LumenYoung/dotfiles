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
      local aider = Terminal:new {
        cmd = "aider",
        hidden = true,
        direction = "float",
        count = 99,
        float_opts = {
          border = "double",
        },
        on_open = function(term)
          vim.cmd "startinsert!"
          vim.api.nvim_buf_set_keymap(term.bufnr, "t", "<C-v>", "<C-\\><C-n>", { noremap = true, silent = true })
          vim.api.nvim_buf_set_keymap(
            term.bufnr,
            "t",
            "<C-\\>",
            "<cmd>lua _G.toggle_aider()<CR>",
            { noremap = true, silent = true }
          )
          vim.api.nvim_buf_set_keymap(
            term.bufnr,
            "t",
            "<C-a>",
            "<cmd>lua _G.toggle_aider()<CR>",
            { noremap = true, silent = true }
          )
        end,
      }

      _G.toggle_aider = function() aider:toggle() end

      opts.mappings = opts.mappings or {}
      opts.mappings.n = opts.mappings.n or {}
      opts.mappings.n["<leader>ta"] = { _G.toggle_aider, desc = "Toggle Aider" }
      opts.mappings.n["<C-a>"] = { _G.toggle_aider, desc = "Toggle Aider" }

      -- Add toggleterm normal mode mapping for Aider
      opts.mappings.t = opts.mappings.t or {}
      opts.mappings.t["<C-a>"] = { "<cmd>lua _G.toggle_aider()<CR>", desc = "Toggle Aider" }

      return opts
    end,
  },
}
