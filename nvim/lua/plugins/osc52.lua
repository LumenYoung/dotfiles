-- Check if we are in an SSH session
if vim.env.SSH_CLIENT or vim.env.SSH_TTY then
  -- Check if Zellij is running
  if vim.env.ZELLIJ_SESSION_NAME then
    -- When inside Zellij over SSH
    return {
      "AstroNvim/astrocore",
      opts = function(_, opts)
        opts.options = opts.options or {}
        opts.options.g = opts.options.g or {}
        opts.options.g.clipboard = {
          name = "OSC 52",
          copy = {
            ["+"] = require("vim.ui.clipboard.osc52").copy("+"),
            ["*"] = require("vim.ui.clipboard.osc52").copy("*"),
          },
          paste = {
            ["+"] = require("vim.ui.clipboard.osc52").paste("+"),
            ["*"] = require("vim.ui.clipboard.osc52").paste("*"),
          },
          cache_enabled = true,
        }
        return opts
      end,
    }
  else
    -- Direct SSH without Zellij (OSC 52)
    return {
      "AstroNvim/astrocore",
      opts = function(_, opts)
        opts.options = opts.options or {}
        opts.options.g = opts.options.g or {}
        opts.options.g.clipboard = {
          name = "OSC 52",
          copy = {
            ["+"] = require("vim.ui.clipboard.osc52").copy("+"),
            ["*"] = require("vim.ui.clipboard.osc52").copy("*"),
          },
          paste = {
            ["+"] = require("vim.ui.clipboard.osc52").paste("+"),
            ["*"] = require("vim.ui.clipboard.osc52").paste("*"),
          },
          cache_enabled = true,
        }
        return opts
      end,
    }
  end
end

-- Return an empty table if not in SSH
return {}
