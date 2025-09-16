return {
  "yetone/avante.nvim",
  event = "VeryLazy",
  lazy = false,
  version = false,
  opts = {
    providers = {
      openrouter = {
        __inherited_from = "openai",
        disable_tools = true,
        endpoint = "https://openrouter.ai/api/v1",
        api_key_name = "OPENROUTER_API_KEY",
        model = "deepseek/deepseek-r1",
        extra_request_body = {
          -- Add any request body parameters here if needed
        },
      },
    },
  },
  build = "make",
  dependencies = {
    "stevearc/dressing.nvim",
    "nvim-lua/plenary.nvim",
    "MunifTanjim/nui.nvim",
    "echasnovski/mini.pick",
    "nvim-telescope/telescope.nvim",
    "hrsh7th/nvim-cmp",
    "ibhagwan/fzf-lua",
    "nvim-tree/nvim-web-devicons",
    "zbirenbaum/copilot.lua",
    {
      "HakonHarnes/img-clip.nvim",
      event = "VeryLazy",
      opts = {
        default = {
          embed_image_as_base64 = false,
          prompt_for_file_name = false,
          drag_and_drop = {
            insert_mode = true,
          },
          use_absolute_path = true,
        },
      },
    },
    {
      "MeanderingProgrammer/render-markdown.nvim",
      opts = {
        file_types = { "markdown", "Avante" },
      },
      ft = { "markdown", "Avante" },
    },
  },
}
