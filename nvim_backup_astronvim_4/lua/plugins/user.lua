-- if true then return {} end -- WARN: REMOVE THIS LINE TO ACTIVATE THIS FILE

-- You can also add or configure plugins by creating files in this `plugins/` folder
-- Here are some examples:

---@type LazySpec
return {

  -- == Examples of Adding Plugins ==

  "andweeb/presence.nvim",
  {
    "ray-x/lsp_signature.nvim",
    event = "BufRead",
    config = function() require("lsp_signature").setup() end,
  },
  {
    "folke/noice.nvim",
    opts = {
      lsp = {
        signature = {
          enabled = false,
        },
      },
    },
  },
  -- == Examples of Overriding Plugins ==

  -- customize alpha options
  {
    "goolord/alpha-nvim",
    opts = function(_, opts)
      local dashboard = require "alpha.themes.dashboard"
      local get_icon = require("astroui").get_icon
      -- customize the dashboard header
      opts.section.header.val = {
        "██      ██    ██ ███    ███ ███████ ███    ██ ███████",
        "██      ██    ██ ████  ████ ██      ████   ██ ██     ",
        "██      ██    ██ ██ ████ ██ █████   ██ ██  ██ ███████",
        "██      ██    ██ ██  ██  ██ ██      ██  ██ ██      ██",
        "███████  ██████  ██      ██ ███████ ██   ████ ███████",
        " ",
        "           ███    ██ ██    ██ ██ ███    ███",
        "           ████   ██ ██    ██ ██ ████  ████",
        "           ██ ██  ██ ██    ██ ██ ██ ████ ██",
        "           ██  ██ ██  ██  ██  ██ ██  ██  ██",
        "           ██   ████   ████   ██ ██      ██",
      }
      opts.section.buttons.val = {
        dashboard.button("LDR S l", get_icon("Refresh", 2, true) .. "Last Session  "),
        dashboard.button("LDR f  ", get_icon("Search", 2, true) .. "Find File  "),
        dashboard.button("LDR n  ", get_icon("FileNew", 2, true) .. "New File  "),
        dashboard.button("LDR s o", get_icon("DefaultFile", 2, true) .. "Recents  "),
        dashboard.button("LDR s t", get_icon("WordFile", 2, true) .. "Find Text"),
        dashboard.button("LDR s m", get_icon("Bookmarks", 2, true) .. "Bookmarks  "),
      }
      return opts
    end,
  },

  {
    "akinsho/toggleterm.nvim",
    opts = {
      open_mapping = [[<c-\>]],
      direction = "float",
    },
  },
  --
  -- You can disable default plugins as follows:
  { "max397574/better-escape.nvim", enabled = true },

  -- You can also easily customize additional setup of plugins that is outside of the plugin's setup call
  {
    "L3MON4D3/LuaSnip",
    config = function(plugin, opts)
      require "astronvim.plugins.configs.luasnip"(plugin, opts) -- include the default astronvim config that calls the setup call
      -- add more custom luasnip configuration such as filetype extend or custom snippets
      local luasnip = require "luasnip"
      luasnip.filetype_extend("javascript", { "javascriptreact" })
    end,
  },

  {
    "windwp/nvim-autopairs",
    config = function(plugin, opts)
      require "astronvim.plugins.configs.nvim-autopairs"(plugin, opts) -- include the default astronvim config that calls the setup call
      -- add more custom autopairs configuration such as custom rules
      local npairs = require "nvim-autopairs"
      local Rule = require "nvim-autopairs.rule"
      local cond = require "nvim-autopairs.conds"
      npairs.add_rules(
        {
          Rule("$", "$", { "tex", "latex" })
            -- don't add a pair if the next character is %
            :with_pair(cond.not_after_regex "%%")
            -- don't add a pair if  the previous character is xxx
            :with_pair(
              cond.not_before_regex("xxx", 3)
            )
            -- don't move right when repeat character
            :with_move(cond.none())
            -- don't delete if the next character is xx
            :with_del(cond.not_after_regex "xx")
            -- disable adding a newline when you press <cr>
            :with_cr(cond.none()),
        },
        -- disable for .vim files, but it work for another filetypes
        Rule("a", "a", "-vim")
      )
    end,
  },
}
