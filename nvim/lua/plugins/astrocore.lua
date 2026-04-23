-- AstroCore provides a central place to modify mappings, vim options, autocommands, and more!
-- Configuration documentation can be found with `:h astrocore`
-- NOTE: We highly recommend setting up the Lua Language Server (`:LspInstall lua_ls`)
--       as this provides autocomplete and documentation while editing

---@type LazySpec
return {
  "AstroNvim/astrocore",
  ---@type AstroCoreOpts
  opts = {
    -- Configure core features of AstroNvim
    features = {
      large_buf = { size = 1024 * 500, lines = 10000 }, -- set global limits for large files for disabling features like treesitter
      autopairs = true, -- enable autopairs at start
      cmp = true, -- enable completion at start
      diagnostics = true, -- enable diagnostics at start
      highlighturl = true, -- highlight URLs at start
      notifications = true, -- enable notifications at start
    },
    treesitter = {
      enabled = function(_, bufnr)
        return #vim.api.nvim_list_uis() > 0 and not require("astrocore.buffer").is_large(bufnr)
      end,
      ensure_installed = { "lua", "vim", "beancount" },
      highlight = function(lang) return lang ~= "markdown" end,
    },
    autocmds = {
      text_yank_post = {
        {
          event = "TextYankPost",
          desc = "Highlight yanked text and copy to clipboard using OSC52",
          callback = function()
            vim.highlight.on_yank()
            local copy_to_unnamedplus = require("vim.ui.clipboard.osc52").copy "+"
            copy_to_unnamedplus(vim.v.event.regcontents)
            local copy_to_unnamed = require("vim.ui.clipboard.osc52").copy "*"
            copy_to_unnamed(vim.v.event.regcontents)
          end,
        },
      },
      buf_read_acwrite = {
        {
          event = "BufRead",
          desc = "Set modifiable for acwrite buffers",
          pattern = "*",
          callback = function()
            if vim.bo.buftype == "acwrite" then vim.bo.modifiable = true end
          end,
        },
      },
      focus_gained = {
        {
          event = "FocusGained",
          desc = "Check for external changes on focus gain",
          callback = function()
            if vim.fn.has "nvim" == 1 or not vim.fn.has "gui_running" then vim.cmd "checktime" end
          end,
        },
      },
      cpp_settings = {
        {
          event = "FileType",
          pattern = "cpp",
          desc = "Set C++ specific settings",
          callback = function()
            vim.bo.tabstop = 2
            vim.bo.shiftwidth = 2
            vim.bo.expandtab = true
          end,
        },
      },
    },
    -- Diagnostics configuration (for vim.diagnostics.config({...})) when diagnostics are on
    diagnostics = {
      virtual_text = true,
      underline = true,
    },
    -- vim options can be configured here
    options = {
      opt = { -- vim.opt.<key>
        relativenumber = true, -- sets vim.opt.relativenumber
        number = true, -- sets vim.opt.number
        spell = false, -- sets vim.opt.spell
        signcolumn = "auto", -- sets vim.opt.signcolumn to auto
        wrap = true, -- sets vim.opt.wrap
        swapfile = false,
        autoread = true, -- sets vim.opt.autoread
      },
      g = { -- vim.g.<key>
        -- configure global vim variables (vim.g)
        -- NOTE: `mapleader` and `maplocalleader` must be set in the AstroNvim opts or before `lazy.setup`
        -- This can be found in the `lua/lazy_setup.lua` file
      },
    },
    -- Mappings can be configured through AstroCore as well.
    -- NOTE: keycodes follow the casing in the vimdocs. For example, `<Leader>` must be capitalized
    mappings = {
      -- first key is the mode
      n = {
        -- second key is the lefthand side of the map

        -- navigate buffer tabs with `H` and `L`
        L = { function() require("astrocore.buffer").nav(vim.v.count1) end, desc = "Next buffer" },
        H = { function() require("astrocore.buffer").nav(-vim.v.count1) end, desc = "Previous buffer" },

        -- mappings seen under group name "Buffer"
        ["<Leader>bD"] = {
          function()
            require("astroui.status.heirline").buffer_picker(
              function(bufnr) require("astrocore.buffer").close(bufnr) end
            )
          end,
          desc = "Pick to close",
        },
        -- tables with just a `desc` key will be registered with which-key if it's installed
        -- this is useful for naming menus
        ["<Leader>b"] = { desc = "Buffers" },
        ["<Leader>bj"] = {
          function()
            require("astroui.status.heirline").buffer_picker(function(bufnr) vim.api.nvim_win_set_buf(0, bufnr) end)
          end,
          desc = "Jump",
        },
        -- quick save
        -- ["<C-s>"] = { ":w!<cr>", desc = "Save File" },  -- change description but the same command

        -- ["<Leader>ft"] = false,
      },
      t = {
        -- setting a mapping to false will disable it
        -- ["<esc>"] = false,
        -- ["<C-v>"] = "<C-\\><C-n>",
        ["<C-v>"] = { -- do keep in mind, hotkeys with modifiers, like this one, have to be capitalized (<leader> nope, <Leader> yep)
          "<C-\\><C-n>",
        },
      },
    },
  },
}
