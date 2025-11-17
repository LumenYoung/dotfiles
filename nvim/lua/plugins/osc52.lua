-- Enable OSC52 only for copying yanks over SSH, without overriding paste behavior
if not (vim.env.SSH_CLIENT or vim.env.SSH_TTY) then
  return {}
end

return {
  "AstroNvim/astrocore",
  opts = function(_, opts)
    opts.autocmds = opts.autocmds or {}
    opts.autocmds.osc52_yank = {
      {
        event = "TextYankPost",
        desc = "Copy yanked text to local clipboard over OSC52 when in SSH",
        callback = function()
          -- regcontents is a list of lines
          local regcontents = vim.v.event and vim.v.event.regcontents
          if not regcontents or vim.tbl_isempty(regcontents) then return end

          local ok, osc52 = pcall(require, "vim.ui.clipboard.osc52")
          if not ok then return end

          local copy_plus = osc52.copy "+"
          local copy_star = osc52.copy "*"

          copy_plus(regcontents)
          copy_star(regcontents)
        end,
      },
    }

    return opts
  end,
}
