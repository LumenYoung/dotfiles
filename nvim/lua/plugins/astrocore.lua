-- if true then return {} end -- WARN: REMOVE THIS LINE TO ACTIVATE THIS FILE

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
      diagnostics_mode = 3, -- diagnostic mode on start (0 = off, 1 = no signs/virtual text, 2 = no virtual text, 3 = on)
      highlighturl = true, -- highlight URLs at start
      notifications = true, -- enable notifications at start
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
        wrap = false, -- sets vim.opt.wrap
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
        ["<Leader>bf"] = {
          function()
            require("telescope.builtin").buffers {
              show_all_buffers = true,
              sort_lastused = true,
              ignore_current_buffer = true,
            }
          end,
          desc = "Buffers",
        },
        -- quick save
        -- ["<C-s>"] = { ":w!<cr>", desc = "Save File" },  -- change description but the same command

        -- Section Search
        ["<Leader>s"] = {
          name = "Search",
          ["m"] = { function() require("telescope.builtin").marks { initial_mode = "normal" } end, "Marks" },
          ["s"] = { "<cmd>lua require('telescope.builtin').treesitter()<cr>", "Treesitter Symbol" },
          ["w"] = {
            function() require("telescope.builtin").current_buffer_fuzzy_find() end,
            "Words in current buffer",
          },
          ["t"] = {
            function()
              require("telescope.builtin").live_grep {
                additional_args = function(args) return vim.list_extend(args, { "--hidden", "--no-ignore" }) end,
              }
            end,
            "Text",
          },
          ["r"] = { function() require("telescope.builtin").registers() end, "Registers" },
          ["k"] = { function() require("telescope.builtin").keymaps() end, "Keymaps" },
          ["o"] = { function() require("telescope.builtin").oldfiles() end, "History" },
          ["M"] = { function() require("telescope.builtin").man_pages() end, "Man" },
          ["n"] = { function() require("telescope").extensions.notify.notify() end, "Notifications" },
          ["h"] = { function() require("telescope.builtin").help_tags() end, "Help" },
          ["C"] = { function() require("telescope.builtin").commands() end, "Commands" },
          ["T"] = {
            function() require("telescope.builtin").colorscheme { enable_preview = true } end,
            "Themes",
          },
          ["a"] = {
            function()
              require("telescope.builtin").find_files {
                prompt_title = "Config Files",
                cwd = vim.fn.stdpath "config",
                follow = true,
              }
            end,
            "AstroNvim config files",
          },
          ["<CR>"] = { function() require("telescope.builtin").resume() end, "Resume previous search" },
          ["f"] = { function() require("telescope.builtin").find_files() end, "Files" },
          ["b"] = {
            function()
              require("telescope.builtin").buffers {
                show_all_buffers = true,
                sort_lastused = true,
                ignore_current_buffer = true,
              }
            end,
            "Buffers",
          },
        },

        ["<Leader>lV"] = { "<cmd>lua vim.diagnostic.config({virtual_text = false})<cr>", desc = "VirtualText Off" },
        ["<Leader>lv"] = { "<cmd>lua vim.diagnostic.config({virtual_text = true})<cr>", desc = "VirtualText On" },
        ["<Leader>f"] = { function() require("telescope.builtin").find_files() end, desc = "Find files" },
        ["<Leader>=w"] = { "<cmd>set wrap<cr>", desc = "Wrap" },
        ["<Leader>=W"] = { "<cmd>set nowrap<cr>", desc = "Unwrap" },
        ["<C-\\>"] = { "<Cmd>ToggleTerm direction=float<CR>", desc = "ToggleTerm float" },

        -- disable default mappings
        ["<Leader>f'"] = false,
        ["<Leader>f/"] = false,
        ["<Leader>f<CR>"] = false,
        ["<Leader>fa"] = false,
        ["<Leader>fb"] = false,
        ["<Leader>fc"] = false,
        ["<Leader>fC"] = false,
        ["<Leader>ff"] = false,
        ["<Leader>fF"] = false,
        ["<Leader>fh"] = false,
        ["<Leader>fk"] = false,
        ["<Leader>fm"] = false,
        ["<Leader>fn"] = false,
        ["<Leader>fo"] = false,
        ["<Leader>fr"] = false,
        ["<Leader>ft"] = false,
        ["<Leader>fw"] = false,
        ["<Leader>fW"] = false,
        ["<Leader>fT"] = false, -- TODO config here: https://github.com/AstroNvim/AstroNvim/blob/b505f4ff41f851fa4a008586995f79408daf72bc/lua/astronvim/plugins/todo-comments.lua#L12

        -- dap telescope, related shortcuts are here: https://github.com/AstroNvim/astrocommunity/blob/main/lua/astrocommunity/debugging/telescope-dap-nvim/init.lua
        ["<Leader>fdc"] = false,
        ["<Leader>fdf"] = false,
        ["<Leader>fdg"] = false,
        ["<Leader>fdl"] = false,
        ["<Leader>fdv"] = false,
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