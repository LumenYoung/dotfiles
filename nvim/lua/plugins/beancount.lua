-- return {} if not on hostname node
if vim.fn.hostname() ~= "pocket" then return {} end

local beancount_file = "/home/yang/Documents/git/finance/beans/main.bean"

return {
  {
    "saghen/blink.cmp",
    -- use the latest release, via version = '*', if you also use the latest release for blink.cmp
    specs = {
      { "saghen/blink.compat", version = "*", lazy = true, opts = {} },
    },
    dependencies = {
      "crispgm/cmp-beancount",
    },
    version = "*",
    -- make sure to set opts so that lazy.nvim calls blink.compat's setup
    opts = {
      sources = {
        default = { "beancount" },
        providers = {
          beancount = {
            name = "beancount",
            module = "blink.compat.source",
            opts = {
              account = beancount_file,
            },
          },
        },
      },
    },
  },
  {
    "AstroNvim/astrolsp",
    ---@param opts AstroLSPOpts
    opts = function(_, opts)
      -- insert `beancount` into our list of servers
      opts.servers = opts.servers or {}
      table.insert(opts.servers, "beancount")

      -- Removed the manual require("cmp_nvim_lsp") and capability merging.
      -- AstroLSP will provide the necessary capabilities, including those from cmp-nvim-lsp if available.

      -- extend our configuration table to include `beancount`
      opts.config = require("astrocore").extend_tbl(opts.config or {}, {
        -- Beancount LSP configuration
        beancount = {
          init_options = {
            journal_file = beancount_file,
          },
          filetypes = { "beancount" },
        },
      })
    end,
  },
}
