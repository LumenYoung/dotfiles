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
      local codex = Terminal:new {
        cmd = "codex",
        hidden = true,
        direction = "float",
        count = 98,
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
            "<cmd>lua _G.toggle_codex()<CR>",
            { noremap = true, silent = true }
          )
          vim.api.nvim_buf_set_keymap(
            term.bufnr,
            "t",
            "<C-space>",
            "<cmd>lua _G.toggle_codex()<CR>",
            { noremap = true, silent = true }
          )
        end,
      }

      _G.toggle_codex = function() codex:toggle() end

      opts.mappings = opts.mappings or {}
      opts.mappings.n = opts.mappings.n or {}
      opts.mappings.n["<leader>tc"] = { _G.toggle_codex, desc = "Toggle Codex" }
      opts.mappings.n["<C-space>"] = { _G.toggle_codex, desc = "Toggle Codex" }

      opts.mappings.t = opts.mappings.t or {}
      opts.mappings.t["<C-space>"] = { "<cmd>lua _G.toggle_codex()<CR>", desc = "Toggle Codex" }

      return opts
    end,
  },
}
