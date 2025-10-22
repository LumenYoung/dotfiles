return {
  "olimorris/codecompanion.nvim",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "nvim-treesitter/nvim-treesitter",
    {
      "AstroNvim/astrocore",
      opts = {
        mappings = {
          n = {
            ["<Leader>a"] = { name = "Code Companion" },
            ["<Leader>aa"] = { "<cmd>CodeCompanionChat<cr>", desc = "Chat" },
            ["<Leader>ap"] = { "<cmd>CodeCompanionActions<cr>", desc = "Action Palette" },
            ["<Leader>ac"] = { "<cmd>CodeCompanionCmd<cr>", desc = "Action Palette" },
          },
          v = {
            ["<Leader>a"] = { name = "Code Companion" },
            ["<Leader>aa"] = { "<cmd>'<,'>CodeCompanion<cr>", desc = "Add Selection" },
            ["<Leader>ae"] = { "<cmd>'<,'>CodeCompanion /explain<cr>", desc = "Explain Selection" },
            ["<Leader>ar"] = { "<cmd>'<,'>CodeCompanion /review<cr>", desc = "Review Selection" },
            ["<Leader>af"] = { "<cmd>'<,'>CodeCompanion /fix<cr>", desc = "Fix Selection" },
            ["<Leader>at"] = { "<cmd>'<,'>CodeCompanion /test<cr>", desc = "Generate Test for Section" },
          },
        },
      },
    },
  },
  opts = {
    strategies = {
      -- Change the default chat adapter
      chat = {
        adapter = "openrouter",
        model = "moonshotai/kimi-k2-0905",
      },
      inline = {
        adapter = "openrouter",
        model = "moonshotai/kimi-k2-0905",
      },
      cmd = {
        adapter = "openrouter",
        model = "deepseek/deepseek-chat-v3.1",
      },
    },
    -- NOTE: The log_level is in `opts.opts`
    opts = {
      log_level = "DEBUG",
    },
    adapters = {
      http = {
        openrouter = function()
          return require("codecompanion.adapters").extend("openai_compatible", {
            env = {
              url = "https://openrouter.ai/api",
              api_key = "OPENROUTER_API_KEY",
              chat_url = "/v1/chat/completions",
            },
            opts = {
              stream = true,
            },
            schema = {
              model = {
                default = "google/gemini-2.5-pro",
                choices = {
                  "google/gemini-2.5-pro",
                  "moonshotai/kimi-k2-0905",
                  "deepseek/deepseek-chat-v3.1",
                  "anthropic/claude-sonnet-4",
                },
              },
            },
          })
        end,
      },
    },
  },
}
