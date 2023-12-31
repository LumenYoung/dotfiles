lvim.builtin.alpha.dashboard.section.buttons.entries = {
  { "f", lvim.icons.ui.FindFile .. "  Find File", "<CMD>Telescope find_files<CR>" },
  { "n", lvim.icons.ui.NewFile .. "  New File", "<CMD>ene!<CR>" },
  { "P", lvim.icons.ui.Project .. "  Projects ", "<CMD>Telescope projects<CR>" },
  { "r", lvim.icons.ui.History .. "  Recent files", ":Telescope oldfiles <CR>" },
  { "t", lvim.icons.ui.FindText .. "  Find Text", "<CMD>Telescope live_grep<CR>" },
  {
    "c",
    lvim.icons.ui.Gear .. "  Configuration",
    "<CMD>edit " .. require("lvim.config"):get_user_config_path() .. " <CR>",
  },
  {
    "p",
    lvim.icons.ui.Gear .. "  Plugins",
    "<CMD>edit " .. "~/dotfiles/lvim/lua/user/lvim_plugins.lua" .. " <CR>",
  },

}

local text = require "lvim.interface.text"
local lvim_version = require("lvim.utils.git").get_lvim_version()

lvim.builtin.alpha.dashboard.section.footer.val = text.align_center({ width = 0 }, {
  "",
  "Personal for Jiaye Yang",
  lvim_version
}, 0.5)
