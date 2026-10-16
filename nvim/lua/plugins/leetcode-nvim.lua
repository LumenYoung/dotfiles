local allowed_hostnames = {
  "pocket",
  -- Add more hostnames as needed
}

if not vim.tbl_contains(allowed_hostnames, vim.fn.hostname()) then return {} end

---@alias lc.lang
---| "cpp"
---| "java"
---| "python"
---| "python3"
---| "c"
---| "csharp"
---| "javascript"
---| "typescript"
---| "php"
---| "swift"
---| "kotlin"
---| "dart"
---| "golang"
---| "ruby"
---| "scala"
---| "rust"
---| "racket"
---| "erlang"
---| "elixir"
---| "bash"

---@alias lc.hook
---| "enter"
---| "question_enter"
---| "leave"

---@alias lc.size
---| string
---| number
---| { width: string | number, height: string | number }

---@alias lc.position "top" | "right" | "bottom" | "left"

---@alias lc.direction "col" | "row"

---@alias lc.inject { before?: string|string[], after?: string|string[] }

---@alias lc.storage table<"cache"|"home", string>

return {
  "kawre/leetcode.nvim",
  build = ":TSUpdate html",
  dependencies = {
    "nvim-telescope/telescope.nvim",
    "nvim-lua/plenary.nvim",
    "MunifTanjim/nui.nvim",
    "nvim-treesitter/nvim-treesitter",
    "nvim-tree/nvim-web-devicons",
    {
      "AstroNvim/astrocore",
      opts = {
        autocmds = {
          leetcode_settings = {
            {
              event = "FileType",
              pattern = "leetcode.nvim",
              callback = function()
                vim.wo.wrap = true
              end,
            },
          },
        },
      },
    },
  },
  opts = {
    -- Configuration options
    arg = "leetcode.nvim",
    lang = "cpp", --
    storage = {
      home = vim.fn.stdpath "data" .. "/leetcode",
      cache = vim.fn.stdpath "cache" .. "/leetcode",
    },
    logging = true,
    -- before = true,
    injector = { ---@type table<lc.lang, lc.inject>
      cpp = { ---@type lc.inject
        before = { "#include <bits/stdc++.h>", "using namespace std;" },
        after = { "int main() {}" },
      },
    },
    console = {
      open_on_runcode = true,
      dir = "row",
      size = {
        width = "90%",
        height = "75%",
      },
    },
    description = {
      position = "left",
      width = "50%",
      show_stats = true,
    },
    image_support = true,
  },
}
