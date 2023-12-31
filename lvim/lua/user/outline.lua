local status_ok, outline = pcall(require, "symbols-outline")
if not status_ok then
  return
end

local opts = {
  highlight_hovered_item = true,
  show_guides = true,
  auto_preview = false,
  position = 'right',
  relative_width = true,
  width = 10,
  auto_close = false,
  show_numbers = false,
  show_relative_numbers = false,
  show_symbol_details = true,
  preview_bg_highlight = 'Pmenu',
  autofold_depth = nil,
  auto_unfold_hover = true,
  fold_markers = { '', '' },
  wrap = false,
  keymaps = { -- These keymaps can be a string or a table for multiple keys
    close = { "<Esc>", "q" },
    goto_location = "<Cr>",
    focus_location = "o",
    hover_symbol = "<C-space>",
    toggle_preview = "K",
    rename_symbol = "r",
    code_actions = "a",
    fold = "h",
    unfold = "l",
    fold_all = "f",
    unfold_all = "z",
    fold_reset = "R",
  },
  lsp_blacklist = {},
  symbol_blacklist = {},
  symbols = {
    File = { hl = "@text.uri" },
    Module = { hl = "@namespace" },
    Namespace = { hl = "@namespace" },
    Package = { hl = "@namespace" },
    Class = { hl = "@type" },
    Method = { hl = "@method" },
    Property = { hl = "@method" },
    Field = { hl = "@field" },
    Constructor = { hl = "@constructor" },
    Enum = { hl = "@type" },
    Interface = { hl = "@type" },
    Function = { hl = "@function" },
    Variable = { hl = "@constant" },
    Constant = { hl = "@constant" },
    String = { hl = "@string" },
    Number = { hl = "@number" },
    Boolean = { hl = "@boolean" },
    Array = { hl = "@constant" },
    Object = { hl = "@type" },
    Key = { hl = "@type" },
    Null = { hl = "@type" },
    EnumMember = { hl = "@field" },
    Struct = { hl = "@type" },
    Event = { hl = "@type" },
    Operator = { hl = "@operator" },
    TypeParameter = { hl = "@parameter" },
  },
}

outline.setup(opts)
