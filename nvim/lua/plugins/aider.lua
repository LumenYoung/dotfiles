return {
  {
    "GeorgesAlkhouri/nvim-aider",
    cmd = "Aider",
    dependencies = {
      { "folke/snacks.nvim", version = ">=2.24.0" },
      -- Optional themes/integrations
      "catppuccin/nvim",
      {
        "nvim-neo-tree/neo-tree.nvim",
        opts = function(_, opts)
          -- Let nvim-aider extend Neo-tree mappings (+, -, =) as documented
          require("nvim_aider.neo_tree").setup(opts)
        end,
      },
    },
    -- Use the recommended default configuration from the README
    opts = {
      -- Command that executes Aider
      aider_cmd = "aider",
      -- Command line arguments passed to aider
      args = {
        "--no-auto-commits",
        "--pretty",
        "--stream",
      },
      -- Automatically reload buffers changed by Aider (requires vim.o.autoread = true)
      auto_reload = false,
      -- Idle timeout in ms for Aider's output.
      idle_timeout = 5000,
      -- Response timeout in ms for Aider's first output chunk.
      response_timeout = 30000,
      -- Timeout in ms for quick commands.
      quick_idle_timeout = 500,
      -- A list of slash-commands that should have a shorter idle timeout.
      quick_commands = {
        "/add",
        "/drop",
        "/read-only",
        "/ls",
        "/clear",
        "/reset",
        "/undo",
      },
      -- Show 'Processing...' and 'Done' notifications.
      notifications = true,
      -- Theme colors (automatically uses Catppuccin flavor if available)
      theme = {
        user_input_color = "#a6da95",
        tool_output_color = "#8aadf4",
        tool_error_color = "#ed8796",
        tool_warning_color = "#eed49f",
        assistant_output_color = "#c6a0f6",
        completion_menu_color = "#cad3f5",
        completion_menu_bg_color = "#24273a",
        completion_menu_current_color = "#181926",
        completion_menu_current_bg_color = "#f4dbd6",
      },
      -- snacks.picker.layout.Config configuration
      picker_cfg = {
        preset = "vscode",
      },
      -- Other snacks.terminal.Opts options
      config = {
        os = { editPreset = "nvim-remote" },
        gui = { nerdFontsVersion = "3" },
      },
      win = {
        wo = { winbar = "Aider" },
        style = "nvim_aider",
        position = "float",
      },
    },
  },
  {
    "AstroNvim/astrocore",
    opts = function(_, opts)
      opts.mappings = opts.mappings or {}

      local keymaps = {
        n = {
          ["<leader>a/"] = { "<cmd>Aider toggle<cr>", desc = "Toggle Aider" },
          ["<leader>as"] = { "<cmd>Aider send<cr>", desc = "Send to Aider" },
          ["<leader>ac"] = { "<cmd>Aider command<cr>", desc = "Aider Commands" },
          ["<leader>ab"] = { "<cmd>Aider buffer<cr>", desc = "Send Buffer" },
          ["<leader>a+"] = { "<cmd>Aider add<cr>", desc = "Add File" },
          ["<leader>a-"] = { "<cmd>Aider drop<cr>", desc = "Drop File" },
          ["<leader>ar"] = { "<cmd>Aider add readonly<cr>", desc = "Add Read-Only" },
          ["<leader>aR"] = { "<cmd>Aider reset<cr>", desc = "Reset Session" },
          ["<C-a>"] = {
            function() require("nvim_aider").api.toggle_terminal() end,
            desc = "Toggle Aider",
          },
        },
        v = {
          ["<leader>as"] = { "<cmd>Aider send<cr>", desc = "Send to Aider" },
        },
        t = {
          ["<C-a>"] = {
            function() require("nvim_aider").api.toggle_terminal() end,
            desc = "Toggle Aider",
          },
        },
      }

      for mode, mappings in pairs(keymaps) do
        opts.mappings[mode] = opts.mappings[mode] or {}
        for key, value in pairs(mappings) do
          opts.mappings[mode][key] = value
        end
      end

      return opts
    end,
  },
}
