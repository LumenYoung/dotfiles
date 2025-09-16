return {
  "olimorris/codecompanion.nvim",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "nvim-treesitter/nvim-treesitter",
  },
  opts = {
    strategies = {
      -- Change the default chat adapter
      chat = {
        adapter = "openrouter",
      },
      inline = {
        adapter = "openrouter",
      },
      cmd = {
        adapter = "openrouter",
      },
    },
    -- NOTE: The log_level is in `opts.opts`
    opts = {
      log_level = "DEBUG",
    },
    adapters = {
      openrouter = function()
        return require("codecompanion.adapters").extend("openai_compatible", {
          env = {
            url = "https://openrouter.ai/api",
            api_key = "OPENROUTER_API_KEY",
            chat_url = "/v1/chat/completions",
          },
          schema = {
            model = {
              default = "google/gemini-2.5-pro",
              choices = {
                "google/gemini-2.5-pro",
                "moonshotai/kimi-k2-0905",
                "deepseek/deepseek-chat-v3.1",
                "anthropic/claude-3.7-sonnet"
              }
            },
          },
        })
      end,
    },
  },
}
