-------------------------------------------------------------------------
----------------------- Additional Plugins ------------------------------
-------------------------------------------------------------------------

lvim.plugins = {
  -- {
  --   "ixru/nvim-markdown",
  --   config = function()
  --     vim.g.vim_markdown_conceal = 1
  --   end
  -- },
  {
    "jbyuki/one-small-step-for-vimkind",
    dependencies = {
      "nvim-lua/plenary.nvim",
    }
  },
  { "mikavilpas/yazi.nvim" },
  {
    "kawre/leetcode.nvim",
    build = ":TSUpdate html",
    lazy = "leetcode.nvim" ~= vim.fn.argv()[1],
    dependencies = {
      "nvim-telescope/telescope.nvim",
      "nvim-lua/plenary.nvim", -- required by telescope
      "MunifTanjim/nui.nvim",

      -- optional
      "nvim-treesitter/nvim-treesitter",
      "rcarriga/nvim-notify",
      "nvim-tree/nvim-web-devicons",
    },
    enabled = function()
      return vim.fn.executable('cc') == 1 or
          vim.fn.executable('gcc') == 1 or
          vim.fn.executable('clang') == 1 or
          vim.fn.executable('cl') == 1 or
          vim.fn.executable('zig') == 1
    end,
    opts = {
      -- configuration goes here
    },
  },
  {
    "ThePrimeagen/harpoon",
    branch = "harpoon2",
    dependencies = { "nvim-lua/plenary.nvim", "nvim-telescope/telescope.nvim" },
    config = function()
      local harpoon = require('harpoon')
      harpoon:setup({})
      -- basic telescope configuration
      local conf = require("telescope.config").values
      local function toggle_telescope(harpoon_files)
        local file_paths = {}
        for _, item in ipairs(harpoon_files.items) do
          table.insert(file_paths, item.value)
        end

        require("telescope.pickers").new({}, {
          prompt_title = "Harpoon",
          finder = require("telescope.finders").new_table({
            results = file_paths,
          }),
          previewer = conf.file_previewer({}),
          sorter = conf.generic_sorter({}),
        }):find()
      end

      -- vim.keymap.set("n", "<C-e>", function() toggle_telescope(harpoon:list()) end,
      --   { desc = "Open harpoon window telescope" })
      vim.keymap.set("n", "<C-e>", function() harpoon.ui:toggle_quick_menu(harpoon:list()) end,
        { desc = "Open harpoon Window" })
      vim.keymap.set("n", "<C-P>", function() harpoon:list():prev() end)
      vim.keymap.set("n", "<C-N>", function() harpoon:list():next() end)
      -- vim.keymap.set("n", "<C-1>", function() harpoon:list():select(1) end)
      -- vim.keymap.set("n", "<C-2>", function() harpoon:list():select(2) end)
      -- vim.keymap.set("n", "<C-3>", function() harpoon:list():select(3) end)
      -- vim.keymap.set("n", "<C-4>", function() harpoon:list():select(4) end)
    end
  },
  {
    "levouh/tint.nvim",
    -- config = function()
    --   -- Override some defaults
    --   require("tint").setup({
    --     -- tint = -45,                                                 -- Darken colors, use a positive value to brighten
    --     -- saturation = 0.6,                                           -- Saturation to preserve
    --     -- transforms = require("tint").transforms.SATURATE_TINT,      -- Showing default behavior, but value here can be predefined set of transforms
    --     -- tint_background_colors = true,                              -- Tint background portions of highlight groups
    --     -- highlight_ignore_patterns = { "WinSeparator", "Status.*" }, -- Highlight group patterns to ignore, see `string.find`
    --     -- window_ignore_function = function(winid)
    --     --   local bufid = vim.api.nvim_win_get_buf(winid)
    --     --   local buftype = vim.api.nvim_buf_get_option(bufid, "buftype")
    --     --   local floating = vim.api.nvim_win_get_config(winid).relative ~= ""

    --     --   -- Do not tint `terminal` or floating windows, tint everything else
    --     --   return buftype == "terminal" or floating
    --     -- end
    --   })
    -- end
  },
  {
    "nvim-neorg/neorg",
    build = ":Neorg sync-parsers",
    -- tag = "*",
    dependencies = { "nvim-lua/plenary.nvim", "nvim-neorg/neorg-telescope" },
    config = function()
      require("neorg").setup {
        load = {
          ["core.defaults"] = {},  -- Loads default behaviour
          ["core.concealer"] = {}, -- Adds pretty icons to your documents
          ["core.dirman"] = {      -- Manages Neorg workspaces
            config = {
              workspaces = {
                main = "~/notes/main",
              },
              default_workspace = "main",
            },
          },
          ["core.promo"] = {},
          ["core.keybinds"] = {},
          ["core.itero"] = {},
          ["core.completion"] = {
            config = {
              engine = "nvim-cmp"
            }
          },
          ["core.summary"] = {},
          ["core.export.markdown"] = {},
        },
      }
      table.insert(lvim.builtin.cmp.sources, { name = "neorg" })
    end,
  },
  {
    "willothy/flatten.nvim",
    config = true,
    -- or pass configuration with
    -- opts = {  }
    opts = function()
      ---@type Terminal?
      local saved_terminal

      return {
        window = {
          open = "alternate",
        },
        callbacks = {
          should_block = function(argv)
            -- Note that argv contains all the parts of the CLI command, including
            -- Neovim's path, commands, options and files.
            -- See: :help v:argv

            -- In this case, we would block if we find the `-b` flag
            -- This allows you to use `nvim -b file1` instead of
            -- `nvim --cmd 'let g:flatten_wait=1' file1`
            return vim.tbl_contains(argv, "-b")

            -- Alternatively, we can block if we find the diff-mode option
            -- return vim.tbl_contains(argv, "-d")
          end,
          pre_open = function()
            local term = require("toggleterm.terminal")
            local termid = term.get_focused_id()
            saved_terminal = term.get(termid)
          end,
          post_open = function(bufnr, winnr, ft, is_blocking)
            if is_blocking and saved_terminal then
              -- Hide the terminal while it's blocking
              saved_terminal:close()
            else
              -- If it's a normal file, just switch to its window
              vim.api.nvim_set_current_win(winnr)

              -- If we're in a different wezterm pane/tab, switch to the current one
              -- Requires willothy/wezterm.nvim
              -- require("wezterm").switch_pane.id(
              --   tonumber(os.getenv("WEZTERM_PANE"))
              -- )
            end

            -- If the file is a git commit, create one-shot autocmd to delete its buffer on write
            -- If you just want the toggleable terminal integration, ignore this bit
            if ft == "gitcommit" or ft == "gitrebase" then
              vim.api.nvim_create_autocmd("BufWritePost", {
                buffer = bufnr,
                once = true,
                callback = vim.schedule_wrap(function()
                  vim.api.nvim_buf_delete(bufnr, {})
                end),
              })
            end
          end,
          block_end = function()
            -- After blocking ends (for a git commit, etc), reopen the terminal
            vim.schedule(function()
              if saved_terminal then
                saved_terminal:open()
                saved_terminal = nil
              end
            end)
          end,
        },
      }
    end,
    -- Ensure that it runs first to minimize delay when opening file from terminal
    lazy = false,
    priority = 1001,
  },
  {
    "subnut/nvim-ghost.nvim",
    config = function()
      vim.api.nvim_command('augroup nvim_ghost_user_autocommands')
      vim.api.nvim_command(
        'autocmd nvim_ghost_user_autocommands User chat.introspector.ink,ai.lumeny.io,www.reddit.com,www.github.com,memos.lumeny.io setfiletype markdown')
      vim.api.nvim_command(
        'autocmd nvim_ghost_user_autocommands User leetcode.com setfiletype cpp')
    end,
    cond = function()
      local hostname = io.popen("uname -n"):read('*a')
      return hostname:find("node") or hostname:find("mainframe")
    end
  },
  { "lambdalisue/suda.vim" },
  {
    "folke/noice.nvim",
    event = "VeryLazy",
    opts = {
      -- add any options here
    },
    config = function()
      require("noice").setup({
        lsp = {
          -- override markdown rendering so that **cmp** and other plugins use **Treesitter**
          override = {
            ["vim.lsp.util.convert_input_to_markdown_lines"] = true,
            ["vim.lsp.util.stylize_markdown"] = true,
            ["cmp.entry.get_documentation"] = true,
          },
        },
        -- you can enable a preset for easier configuration
        routes = {
          {
            filter = {
              event = "msg_show",
              kind = "",
              find = "written",
            },
            opts = { skip = true },
          },
        },
        presets = {
          bottom_search = true,         -- use a classic bottom cmdline for search
          command_palette = true,       -- position the cmdline and popupmenu together
          long_message_to_split = true, -- long messages will be sent to a split
          inc_rename = false,           -- enables an input dialog for inc-rename.nvim
          lsp_doc_border = false,       -- add a border to hover docs and signature help
        },
      })
    end,
    dependencies = {
      -- if you lazy-load any plugin below, make sure to add proper `module="..."` entries
      "MunifTanjim/nui.nvim",
      -- OPTIONAL:
      --   `nvim-notify` is only needed, if you want to use the notification view.
      --   If not available, we use `mini` as the fallback
      "rcarriga/nvim-notify",
    }
  },
  {
    "jpalardy/vim-slime",
    config = function()
      vim.g.slime_target = "zellij"
      vim.g.slime_bracketed_paste = 1
      vim.g.slime_default_config = { session_id = "current", relative_pane = "right" }
    end
  },
  {
    "navarasu/onedark.nvim"
  },
  {
    'ojroques/nvim-osc52',
    config = function()
      local function copy(lines, _)
        require('osc52').copy(table.concat(lines, '\n'))
      end

      local function paste()
        return { vim.fn.split(vim.fn.getreg(''), '\n'), vim.fn.getregtype('') }
      end

      vim.g.clipboard = {
        name = 'osc52',
        copy = { ['+'] = copy, ['*'] = copy },
        paste = { ['+'] = paste, ['*'] = paste },
      }
    end,
    cond = function()
      -- disable when running in konsole since no support for OSC52
      if vim.fn.getenv("KONSOLE_DBUS_SERVICE") ~= vim.NIL or vim.fn.getenv("KONSOLE_DBUS_SESSION") ~= vim.NIL or vim.fn.getenv("KONSOLE_VERSION") ~= vim.NIL then
        return false
      end

      return true
    end
  },
  {
    'projekt0n/github-nvim-theme',
    lazy = false,    -- make sure we load this during startup if it is your main colorscheme
    priority = 1000, -- make sure to load this before all the other start plugins
    config = function()
      require('github-theme').setup({
        options = {
          transparent = false,
        }
      })

      vim.cmd('colorscheme github_dark')
    end,
  },
  {
    "robitx/gp.nvim",
    config = function()
      -- Only setup the plugin if OPENAI_API_KEY environment variable exists
      if vim.fn.getenv('OPENAI_API_KEY') ~= vim.NIL then
        require("gp").setup()
        -- or setup with your own config (see Install > Configuration in Readme)
        -- require("gp").setup(config)
        -- shortcuts might be setup here (see Usage > Shortcuts in Readme)
      end
    end,
  },
  -- {
  --   "jackMort/ChatGPT.nvim",
  --   event = "VeryLazy",
  --   config = function()
  --     require("chatgpt").setup()
  --   end,
  --   dependencies = {
  --     "MunifTanjim/nui.nvim",
  --     "nvim-lua/plenary.nvim",
  --     "nvim-telescope/telescope.nvim"
  --   }
  -- },
  -- {
  --   "ggandor/leap.nvim",
  --   config = function()
  --     require('leap').add_default_mappings()
  --   end
  -- },

  {
    "folke/flash.nvim",
    event = "VeryLazy",
    opts = {},
    -- stylua: ignore
    keys = {
      { "s", mode = { "n", "x", "o" }, function() require("flash").jump() end,       desc = "Flash" },
      { "S", mode = { "n", "x", "o" }, function() require("flash").treesitter() end, desc = "Flash Treesitter" },
      { "r", mode = "o",               function() require("flash").remote() end,     desc = "Remote Flash" },
      {
        "R",
        mode = { "o", "x" },
        function() require("flash").treesitter_search() end,
        desc =
        "Treesitter Search"
      },
      {
        "<c-s>",
        mode = { "c" },
        function() require("flash").toggle() end,
        desc =
        "Toggle Flash Search"
      },
    },
    config = function()
      require("flash").toggle()
    end
  },
  "savq/melange",
  { "p00f/clangd_extensions.nvim" },
  {
    'rose-pine/neovim',
    name = 'rose-pine',
  },
  -- github light theme
  -- {
  --   'projekt0n/github-nvim-theme',
  --   -- config = function()
  --   --   require('github-theme').setup({
  --   --     -- ...
  --   --     dark_sidebar = true
  --   --   })
  --   -- end
  -- },
  -- "AckslD/swenv.nvim",
  {
    "mfussenegger/nvim-dap-python",
    ft = "python",
    config = function(_, opts)
      local mason_path = vim.fn.glob(vim.fn.stdpath "data" .. "/mason/")

      require("dap-python").setup(mason_path .. "packages/debugpy/venv/bin/python")
    end
  },
  'sainnhe/everforest',
  "imsnif/kdl.vim",
  -- {
  --   -- You can generate docstrings automatically.
  --   "danymat/neogen",
  --   config = function()
  --     require("neogen").setup {
  --       enabled = true,
  --       languages = {
  --         python = {
  --           template = {
  --             annotation_convention = "numpydoc",
  --           },
  --         },
  --       },
  --     }
  --   end,
  -- },
  -- {
  --   'glacambre/firenvim',
  --   build = function() vim.fn['firenvim#install'](0) end
  -- },
  {
    "rmagatti/goto-preview",
    config = function()
      require('goto-preview').setup {
        width = 120,             -- Width of the floating window
        height = 25,             -- Height of the floating window
        default_mappings = true, -- Bind default mappings
        debug = false,           -- Print debug information
        opacity = nil,           -- 0-100 opacity level of the floating window where 100 is fully transparent.
        post_open_hook = nil     -- A function taking two arguments, a buffer and a window to be ran as a hook.
        -- You can use "default_mappings = true" setup option
        -- Or explicitly set keybindings
        -- vim.cmd("nnoremap gpd <cmd>lua require('goto-preview').goto_preview_definition()<CR>")
        -- vim.cmd("nnoremap gpi <cmd>lua require('goto-preview').goto_preview_implementation()<CR>")
        -- vim.cmd("nnoremap gP <cmd>lua require('goto-preview').close_all_win()<CR>")
      }
    end
  },
  -- {
  --   "petertriho/nvim-scrollbar",
  --   config = function()
  --     require("scrollbar").setup()
  --   end
  -- },
  -- {
  --   "dstein64/nvim-scrollview",
  --   config = function()
  --     require('scrollview').setup({
  --       excluded_filetypes = { 'nerdtree' },
  --       current_only = true,
  --       winblend = 75,
  --       base = 'buffer',
  --       column = 80,
  --       signs_on_startup = { 'all' },
  --       diagnostics_severities = {}
  --       -- diagnostics_severities = { vim.diagnostic.severity.ERROR }
  --     })
  --     -- vim.cmd("ScrollViewDisable")
  --   end

  -- },
  -- notify with pop up
  { 'rcarriga/nvim-notify' },
  -- add markdown preview
  {
    "iamcco/markdown-preview.nvim",
    build = function() vim.fn["mkdp#util#install"]() end,
    ft = 'markdown',
  },

  -- You can run blocks of code like jupyter notebook.
  { "dccsillag/magma-nvim",  build = ':UpdateRemotePlugins' },
  -- {
  --   "glepnir/lspsaga.nvim",
  --   branch = "main",
  --   config = function()
  --       require('lspsaga').setup({})
  --   end
  -- },
  -- outline for languages
  {
    "hedyhli/outline.nvim",
    config = function()
      -- Example mapping to toggle outline
      require("outline").setup()
    end,
  },
  -- { 'kkoomen/vim-doge',              build = ':call doge#install()' },
  {
    "danymat/neogen",
    dependencies = "nvim-treesitter/nvim-treesitter",
    config = function()
      require("neogen").setup {
        enabled = true,
        languages = {
          python = {
            template = {
              annotation_convention = "numpydoc",
            },
          },
        },
      }
    end,
    -- Uncomment next line if you want to follow only stable versions
    -- version = "*"
  },
  {
    'mrjones2014/legendary.nvim'
    -- sqlite is only needed if you want to use frecency sorting
  },
  { 'stevearc/dressing.nvim' },
  { 'hrsh7th/cmp-cmdline' },
  {
    "echasnovski/mini.map",
    branch = "stable",
    config = function()
      require('mini.map').setup()
      local map = require('mini.map')
      map.setup({
        integrations = {
          map.gen_integration.builtin_search(),
          map.gen_integration.gitsigns({
            add = 'GitSignsAdd',
            change = 'GitSignsChange',
            delete = 'GitSignsDelete',
          }),
          map.gen_integration.diagnostic({
            error = 'DiagnosticFloatingError',
            warn  = 'DiagnosticFloatingWarn',
            info  = 'DiagnosticFloatingInfo',
            hint  = 'DiagnosticFloatingHint',
          }),
        },
        symbols = {
          encode = map.gen_encode_symbols.dot('4x2'),
          scroll_line = '➽',
          scroll_view = '┃',
        },
        window = {
          side = 'right',                 -- Side to stick ('left' or 'right')
          width = 17,                     -- Total width
          winblend = 25,                  -- Value of 'winblend' option
          focusable = true,               -- Whether window is focusable in normal way (with `wincmd` or mouse)
          show_integration_count = false, -- Whether to show count of multiple integration highlights
        },
      })
    end
  },
  {
    "epwalsh/obsidian.nvim",
    enabled = function()
      return vim.fn.executable('obsidian') == 1
    end,
    config = function()
      require("obsidian").setup({
        dir = "~/obsidian",
        use_advanced_uri = true,
        disable_frontmatter = false,
        completion = {
          nvim_cmp = true, -- if using nvim-cmp, otherwise set to false
        },
        daily_notes = {
          folder = "Days",
        },
        mappings = {
          -- Overrides the 'gf' mapping to work on markdown/wiki links within your vault.
          ["gf"] = {
            action = function()
              return require("obsidian").util.gf_passthrough()
            end,
            opts = { noremap = false, expr = true, buffer = true },
          },
          -- Toggle check-boxes.
          -- ["<leader>oc"] = {
          --   action = function()
          --     return require("obsidian").util.toggle_checkbox()
          --   end,
          --   opts = { buffer = true },
          -- },
        },
        note_frontmatter_func = function(note)
          -- This is equivalent to the default frontmatter function.
          local out = { id = note.id, tags = note.tags }
          -- `note.metadata` contains any manually added fields in the frontmatter.
          -- So here we just make sure those fields are kept in the frontmatter.
          if note.metadata ~= nil and not vim.tbl_isempty(note.metadata) then
            for k, v in pairs(note.metadata) do
              out[k] = v
            end
          end
          return out
        end,
        finder_mappings = {
          -- Create a new note from your query with `:ObsidianSearch` and `:ObsidianQuickSwitch`.
          -- Currently only telescope supports this.
          new = "<C-x>",
        },

      })
      require("nvim-treesitter.configs").setup({
        highlight = {
          enable = true,
          additional_vim_regex_highlighting = { "markdown" },
        },
      })
    end,
  },
  {
    "simrat39/rust-tools.nvim",
    config = function()
      require("rust-tools").setup {
        tools = {
          executor = require("rust-tools/executors").termopen, -- can be quickfix or termopen
          reload_workspace_from_cargo_toml = true,
          runnables = {
            use_telescope = true,
          },
          inlay_hints = {
            auto = true,
            only_current_line = false,
            show_parameter_hints = false,
            parameter_hints_prefix = "<-",
            other_hints_prefix = "=>",
            max_len_align = false,
            max_len_align_padding = 1,
            right_align = false,
            right_align_padding = 7,
            highlight = "Comment",
          },
          hover_actions = {
            border = "rounded",
          },
          on_initialized = function()
            vim.api.nvim_create_autocmd({ "BufWritePost", "BufEnter", "CursorHold", "InsertLeave" }, {
              pattern = { "*.rs" },
              callback = function()
                local _, _ = pcall(vim.lsp.codelens.refresh)
              end,
            })
          end,
        },
        -- dap = {
        --   -- adapter= codelldb_adapter,
        --   adapter = require("rust-tools.dap").get_codelldb_adapter(codelldb_path, liblldb_path),
        -- },
        server = {
          on_attach = function(client, bufnr)
            require("lvim.lsp").common_on_attach(client, bufnr)
            local rt = require "rust-tools"
            vim.keymap.set("n", "K", rt.hover_actions.hover_actions, { buffer = bufnr })
          end,

          capabilities = require("lvim.lsp").common_capabilities(),
          settings = {
            ["rust-analyzer"] = {
              lens = {
                enable = true,
              },
              checkOnSave = {
                enable = true,
                command = "clippy",
              },
            },
          },
        },
      }
    end
  },
  -- { 'echasnovski/mini.animate', config = function()
  --   require('mini.animate').setup(
  --     { cursor = {
  --       enable = true,
  --       timing = function(_, n) return 150 / n end, --<function: implements linear total 250ms animation duration>,
  --     },
  --       scroll = {
  --         -- Whether to enable this animation
  --         enable = false,
  --       },
  --     }
  --   )

  -- end },
  {
    "stevearc/aerial.nvim",
    config = function()
      require('aerial').setup()
    end
  },
  {
    "lervag/vimtex",
    config = function()
      vim.cmd [[
      syntax enable
      let g:vimtex_view_method = 'sioyek'
      let maplocalleader = '\'
      ]]
    end,
    ft = "tex",
  },
  {
    'edluffy/specs.nvim',
    config = function()
      require('specs').setup {
        show_jumps       = true,
        min_jump         = 30,
        popup            = {
          delay_ms = 0, -- delay before popup displays
          inc_ms = 10,  -- time increments used for fade/resize effects
          blend = 10,   -- starting blend, between 0-100 (fully transparent), see :h winblend
          width = 10,
          winhl = "PMenu",
          fader = require('specs').linear_fader,
          resizer = require('specs').shrink_resizer
        },
        ignore_filetypes = {},
        ignore_buftypes  = {
          nofile = true,
        },
      }
    end
  },
  {
    "Shatur/neovim-session-manager",
    config = function()
      local Path = require('plenary.path')
      require('session_manager').setup({
        sessions_dir = Path:new(vim.fn.stdpath('data'), 'sessions'),               -- The directory where the session files will be saved.
        path_replacer = '__',                                                      -- The character to which the path separator will be replaced for session files.
        colon_replacer = '++',                                                     -- The character to which the colon symbol will be replaced for session files.
        autoload_mode = require('session_manager.config').AutoloadMode.CurrentDir, -- Define what to do when Neovim is started without arguments. Possible values: Disabled, CurrentDir, LastSession
        autosave_last_session = true,                                              -- Automatically save last session on exit and on session switch.
        autosave_ignore_not_normal = true,                                         -- Plugin will not save a session when no buffers are opened, or all of them aren't writable or listed.
        autosave_ignore_dirs = {},                                                 -- A list of directories where the session will not be autosaved.
        autosave_ignore_filetypes = {                                              -- All buffers of these file types will be closed before the session is saved.
          'gitcommit',
        },
        autosave_ignore_buftypes = {},    -- All buffers of these bufer types will be closed before the session is saved.
        autosave_only_in_session = false, -- Always autosaves session. If true, only autosaves after a session is active.
        max_path_length = 80,             -- Shorten the display path if length exceeds this threshold. Use 0 if don't want to shorten the path at all.
      })
    end
  },
  {
    'declancm/cinnamon.nvim',
    config = function() require('cinnamon').setup() end
  },
  {
    "zbirenbaum/copilot.lua",
    cmd = "Copilot",
    -- event = "InsertEnter",
    config = function()
      require("copilot").setup({
        suggestion = { enabled = true },
        panel = {
          enabled = true,
          auto_refresh = true,
          layout = {
            position = "bottom", -- | top | left | right
            ratio = 0.3
          },
        },
        filetypes = {
          norg = false
        }

      })
    end,
    cond = function()
      if vim.fn.executable('node') == 1 then
        return true
      else
        return false
      end
    end
  },
  {
    "zbirenbaum/copilot-cmp",
    dependencies = { "copilot.lua", "nvim-cmp" },
    config = function()
      require("copilot_cmp").setup()
    end,
    cond = function()
      if vim.fn.executable('node') == 1 then
        return true
      else
        return false
      end
    end
  },
  {
    "iurimateus/luasnip-latex-snippets.nvim",
    -- replace "lervag/vimtex" with "nvim-treesitter/nvim-treesitter" if you're
    -- using treesitter.
    dependencies = { "L3MON4D3/LuaSnip", "lervag/vimtex" },
    config = function()
      require 'luasnip-latex-snippets'.setup()
      -- or setup({ use_treesitter = true })
    end,
    ft = "tex",
  },
  { "NoahTheDuke/vim-just" }

}
